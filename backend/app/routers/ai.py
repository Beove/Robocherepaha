from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.config import settings
from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole
import chromadb
import os

router = APIRouter(prefix="/ai", tags=["ai"])

# Инициализация ChromaDB с отключённой телеметрией
chroma_client = chromadb.PersistentClient(
    path="/app/chroma_db",
    settings=chromadb.Settings(anonymized_telemetry=False)
)

def get_gigachat():
    return GigaChat(credentials=settings.gigachat_api_key, verify_ssl_certs=False)

def get_embedding(text: str) -> list:
    """Получает embedding через GigaChat Embeddings"""
    with get_gigachat() as giga:
        response = giga.embeddings(texts=[text])
        return response.data[0].embedding

def get_collection():
    return chroma_client.get_or_create_collection(name="knowledge_base_giga")

def load_knowledge_base():
    """Загружает базу знаний в ChromaDB с GigaChat embeddings"""
    collection = get_collection()

    if collection.count() > 0:
        return

    kb_path = "/app/knowledge_base/admissions_faq.txt"
    if not os.path.exists(kb_path):
        return

    with open(kb_path, "r", encoding="utf-8") as f:
        text = f.read()

    chunks = [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]

    # Получаем embeddings через GigaChat для каждого чанка
    embeddings = []
    for chunk in chunks:
        embedding = get_embedding(chunk)
        embeddings.append(embedding)

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[f"chunk_{i}" for i in range(len(chunks))]
    )
    print(f"Knowledge base loaded with GigaChat embeddings: {len(chunks)} chunks")

try:
    load_knowledge_base()
except Exception as e:
    print(f"Warning: Could not load knowledge base: {e}")

SYSTEM_PROMPT = """Ты — AI-консультант приёмной комиссии университета. Твоя единственная задача — помогать абитуриентам с вопросами о поступлении.

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
Email: priem@university.ru, Телефон: +7 (495) 123-45-67

6. Отвечай на русском языке, вежливо и профессионально. Всегда обращайся к пользователю на "Вы". Никогда не используй обращение на "ты".

ПОМНИ: ты представляешь университет. Любой твой ответ — это официальная позиция учреждения."""

class AskRequest(BaseModel):
    question: str

class AskResponse(BaseModel):
    answer: str
    found_context: bool

@router.post("/ask", response_model=AskResponse)
def ask_consultant(
    data: AskRequest,
    current_user: User = Depends(get_current_user)
):
    if len(data.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="Вопрос слишком короткий")

    if len(data.question) > 1000:
        raise HTTPException(status_code=400, detail="Вопрос слишком длинный")

    try:
        # Получаем embedding вопроса через GigaChat
        question_embedding = get_embedding(data.question)

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
            user_message = f"Контекст из базы знаний:\n{context}\n\nВопрос пользователя: {data.question}"
        else:
            user_message = f"Вопрос пользователя: {data.question}"

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
        return AskResponse(answer=answer, found_context=found_context)

    except Exception as e:
        # Обеспечение отказоустойчивости: при недоступности AI-сервиса возвращается fallback-ответ без прерывания работы системы
        print(f"AI error: {type(e).__name__}: {e}")
        return AskResponse(
            answer="Извините, сервис консультаций временно недоступен. Пожалуйста, обратитесь в приёмную комиссию: priem@university.ru или +7 (495) 123-45-67",
            found_context=False
        )