from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.celery_app import celery_app
from app.auth.dependencies import get_current_user
from app.models.user import User
import asyncio
import json

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/ai/{task_id}")
async def websocket_ai_status(
    websocket: WebSocket,
    task_id: str
):
    await websocket.accept()

    try:
        while True:
            # Проверяем статус задачи в Celery
            task = celery_app.AsyncResult(task_id)

            if task.state == "PENDING":
                # Задача в очереди — считаем позицию
                await websocket.send_json({
                    "status": "queued",
                    "message": "Ваш запрос обрабатывается..."
                })

            elif task.state == "STARTED":
                await websocket.send_json({
                    "status": "processing",
                    "message": "Получаем ответ от AI консультанта..."
                })

            elif task.state == "SUCCESS":
                result = task.result
                await websocket.send_json({
                    "status": "completed",
                    "answer": result["answer"],
                    "found_context": result["found_context"]
                })
                break

            elif task.state == "FAILURE":
                await websocket.send_json({
                    "status": "error",
                    "message": "Произошла ошибка. Пожалуйста, попробуйте ещё раз."
                })
                break

            # Проверяем каждые 2 секунды
            await asyncio.sleep(2)

    except WebSocketDisconnect:
        pass