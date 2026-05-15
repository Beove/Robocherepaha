from app.celery_app import celery_app
from app.config import settings
from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole
import chromadb
import os

# Инициализация ChromaDB
chroma_client = chromadb.PersistentClient(
    path="/app/chroma_db",
    settings=chromadb.Settings(anonymized_telemetry=False)
)

def get_gigachat():
    return GigaChat(credentials=settings.gigachat_api_key, verify_ssl_certs=False)

def get_collection():
    return chroma_client.get_or_create_collection(name="knowledge_base_giga")

def get_embedding(text: str) -> list:
    with get_gigachat() as giga:
        response = giga.embeddings(texts=[text])
        return response.data[0].embedding

def init_knowledge_base():
    """Загружает базу знаний в ChromaDB. При изменении числа чанков — переиндексирует."""
    kb_path = "/app/knowledge_base/admissions_faq.txt"
    if not os.path.exists(kb_path):
        print("Knowledge base file not found")
        return

    with open(kb_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Разбиваем на чанки по 1000 символов с перекрытием 200
    chunk_size = 1000
    overlap = 200
    chunks = []
    i = 0
    while i < len(text):
        chunk = text[i:i + chunk_size]
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap

    collection = get_collection()
    existing = collection.count()

    if existing == len(chunks):
        print(f"Knowledge base already indexed: {existing} chunks, skipping.")
        return

    print(f"Indexing knowledge base: {len(chunks)} chunks (existing: {existing})...")

    # Удаляем старую коллекцию и создаём заново
    if existing > 0:
        chroma_client.delete_collection(name="knowledge_base_giga")
        collection = chroma_client.get_or_create_collection(name="knowledge_base_giga")

    # Индексируем чанки
    for idx, chunk in enumerate(chunks):
        embedding = get_embedding(chunk)
        collection.add(
            documents=[chunk],
            embeddings=[embedding],
            ids=[f"chunk_{idx}"],
            metadatas=[{"source": "admissions_faq"}]
        )
        print(f"Indexed chunk {idx + 1}/{len(chunks)}")

    print("Knowledge base indexing complete!")

# Запускаем индексацию при старте воркера
init_knowledge_base()


SYSTEM_PROMPT = """Ты — AI-консультант приёмной комиссии Московского политехнического университета. Твоя единственная задача — помогать абитуриентам с вопросами о поступлении.

СТРОГИЕ ПРАВИЛА:

1. Отвечай ТОЛЬКО на вопросы связанные с поступлением в университет: документы, сроки, направления, статусы заявлений, стоимость обучения, контакты приёмной комиссии.

2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- Обсуждать политику, религию, национальность, расу, пол
- Решать домашние задания, контрольные, курсовые, дипломные работы
- Писать код, эссе, рефераты, сочинения по просьбе пользователя
- Обсуждать темы не связанные с поступлением (игры, фильмы, музыка и т.д.)
- Давать медицинские, юридические или финансовые советы
- Высказывать мнения о политиках, государствах, конфликтах
- Генерировать контент который может нанести вред или вызвать скандал

3. Если вопрос не по теме поступления — вежливо откажи и напомни свою роль.

4. Используй ТОЛЬКО информацию из предоставленного контекста. Не выдумывай данные.

5. Если в контексте нет ответа — честно скажи и направь в приёмную комиссию:
Телефон: +7 (495) 223-05-23, Email: priem@mospolytech.ru
График: ПН-ЧТ 10:30–18:00, ПТ 10:30–17:00

6. Отвечай на русском языке, вежливо и профессионально. Всегда обращайся к пользователю на "Вы".

ПОМНИ: ты представляешь Московский Политех. Любой твой ответ — это официальная позиция учреждения."""


@celery_app.task(bind=True)
def process_ai_question(self, question: str) -> dict:
    """Celery задача для обработки вопроса к AI консультанту"""
    try:
        # Получаем embedding вопроса через GigaChat
        question_embedding = get_embedding(question)

        # Ищем релевантные куски в ChromaDB
        collection = get_collection()
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=3
        )

        context_chunks = results["documents"][0] if results["documents"] else []
        found_context = len(context_chunks) > 0

        if found_context:
            context = "\n\n".join(context_chunks)
            user_message = f"Контекст из базы знаний:\n{context}\n\nВопрос пользователя: {question}"
        else:
            user_message = f"Вопрос пользователя: {question}"

        # Запрос к GigaChat
        with get_gigachat() as giga:
            response = giga.chat(Chat(
                messages=[
                    Messages(role=MessagesRole.SYSTEM, content=SYSTEM_PROMPT),
                    Messages(role=MessagesRole.USER, content=user_message)
                ],
                max_tokens=500,
                temperature=0.3
            ))

        answer = response.choices[0].message.content
        return {"answer": answer, "found_context": found_context}

    except Exception as e:
        print(f"Task error: {type(e).__name__}: {e}")
        return {
            "answer": "Извините, сервис консультаций временно недоступен. Пожалуйста, обратитесь в приёмную комиссию: priem@mospolytech.ru или +7 (495) 223-05-23",
            "found_context": False
        }