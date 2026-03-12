# Mango Office Transcription Backend

FastAPI backend for the Mango Office transcription application.

## Setup

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will run on http://localhost:8000

## Environment Variables

Create a `.env` file in the project root:

```
DEEPSEEK_API_KEY=your_key
GEMINI_API_KEY=your_key
ASSEMBLYAI_API_KEY=your_key
SECRET_KEY=your_secret_key
CORS_ORIGINS=["http://localhost:3000"]
```

## API Documentation

Once running, visit http://localhost:8000/docs for interactive API documentation.

