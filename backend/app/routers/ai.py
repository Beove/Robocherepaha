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

def get_collection():
    return chroma_client.get_or_create_collection(name="knowledge_base")

def load_knowledge_base():
    """Загружает базу знаний в ChromaDB если она пустая"""
    collection = get_collection()

    if collection.count() > 0:
        return

    kb_path = "/app/knowledge_base/admissions_faq.txt"
    if not os.path.exists(kb_path):
        return

    with open(kb_path, "r", encoding="utf-8") as f:
        text = f.read()

    chunks = [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]

    collection.add(
        documents=chunks,
        ids=[f"chunk_{i}" for i in range(len(chunks))]
    )
    print(f"Knowledge base loaded: {len(chunks)} chunks")

try:
    load_knowledge_base()
except Exception as e:
    print(f"Warning: Could not load knowledge base: {e}")

SYSTEM_PROMPT = """Ты — AI-консультант приёмной комиссии университета.

Отвечай ТОЛЬКО на вопросы связанные с поступлением в университет.
Используй ТОЛЬКО информацию из предоставленного контекста.

Если в контексте нет ответа на вопрос — честно скажи что не располагаешь 
этой информацией и порекомендуй обратиться в приёмную комиссию:
Email: priem@university.ru, Телефон: +7 (495) 123-45-67

Если вопрос не связан с поступлением — вежливо объясни что можешь 
помочь только с вопросами приёмной комиссии.

Отвечай на русском языке, вежливо и по делу."""

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
        # Читаем всю базу знаний напрямую
        kb_path = "/app/knowledge_base/admissions_faq.txt"
        if os.path.exists(kb_path):
            with open(kb_path, "r", encoding="utf-8") as f:
                knowledge_base = f.read()
            user_message = f"База знаний приёмной комиссии:\n{knowledge_base}\n\nВопрос пользователя: {data.question}"
            found_context = True
        else:
            user_message = f"Вопрос пользователя: {data.question}"
            found_context = False

        # Запрос к GigaChat
        with GigaChat(credentials=settings.gigachat_api_key, verify_ssl_certs=False) as giga:
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