FROM python:3.11-slim

WORKDIR /app

# Copia las dependencias e instala primero para aprovechar la caché de capas
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código de la aplicación
COPY app ./app

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
