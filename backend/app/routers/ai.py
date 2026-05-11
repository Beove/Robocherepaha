from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.tasks import process_ai_question
from app.middleware import limiter

router = APIRouter(prefix="/ai", tags=["ai"])

class AskRequest(BaseModel):
    question: str

class AskResponse(BaseModel):
    task_id: str
    message: str

@router.post("/ask", response_model=AskResponse)
@limiter.limit("5/minute")
def ask_consultant(
    request: Request,
    data: AskRequest,
    current_user: User = Depends(get_current_user)
):
    if len(data.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="Вопрос слишком короткий")

    if len(data.question) > 1000:
        raise HTTPException(status_code=400, detail="Вопрос слишком длинный")

    # Отправляем задачу в очередь Celery
    task = process_ai_question.delay(data.question)

    return AskResponse(
        task_id=task.id,
        message="Ваш запрос принят. Подключитесь к WebSocket для получения ответа."
    )

@router.get("/status/{task_id}", response_model=dict)
@limiter.limit("30/minute")
def get_task_status(
    request: Request,
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Получить статус задачи (альтернатива WebSocket для простых клиентов)"""
    from app.celery_app import celery_app
    task = celery_app.AsyncResult(task_id)

    if task.state == "PENDING":
        return {"status": "queued", "message": "Запрос в очереди"}
    elif task.state == "STARTED":
        return {"status": "processing", "message": "Обрабатывается"}
    elif task.state == "SUCCESS":
        return {"status": "completed", "result": task.result}
    elif task.state == "FAILURE":
        return {"status": "error", "message": "Произошла ошибка"}
    else:
        return {"status": task.state}