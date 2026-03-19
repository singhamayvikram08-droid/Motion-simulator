from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

app = FastAPI(title="Digital Twin AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExamScoreRequest(BaseModel):
    study_hours: float
    past_marks: float
    attendance_percent: float

class AttendanceRequest(BaseModel):
    conducted: int
    attended: int
    target_percent: float

class ChatRequest(BaseModel):
    message: str
    subject_name: str
    attendance_percent: float
    predicted_score: float | None = None

@app.get("/")
def read_root():
    return {"message": "Digital Twin AI Service is running"}

@app.post("/predict/exam-score")
def predict_exam_score(data: ExamScoreRequest):
    # Dummy Linear Regression Logic
    # weight mapping: study_hours: 2.5, past_marks: 0.6, attendance: 0.2
    
    # Simple heuristic math simulating a model for now
    predicted = (data.study_hours * 2.5) + (data.past_marks * 0.6) + (data.attendance_percent * 0.2)
    
    # Cap at 100
    predicted = min(100.0, rounded_score(predicted))
    
    return {
        "predicted_score": predicted,
        "insights": "Consistent study hours greatly improve your chances."
    }

def rounded_score(val):
    return round(val, 2)

@app.post("/predict/attendance")
def predict_attendance(data: AttendanceRequest):
    if data.conducted == 0:
        return {"needed": 0, "bunks": 0, "current_percent": 0.0}
        
    current_percent = (data.attended / data.conducted) * 100
    target_decimal = data.target_percent / 100.0
    
    # Calculate classes needed
    # (Attended + x) / (Conducted + x) = Target
    # Attended + x = Target * Conducted + Target * x
    # x * (1 - Target) = Target * Conducted - Attended
    # x = (Target * Conducted - Attended) / (1 - Target)
    
    needed = 0
    if current_percent < data.target_percent:
        if data.target_percent == 100:
            needed = -1 # Impossible
        else:
            needed = (target_decimal * data.conducted - data.attended) / (1 - target_decimal)
            needed = max(0, int(np.ceil(needed)))
            
    # Calculate safe bunks
    # Attended / (Conducted + y) = Target
    # Attended = Target * Conducted + Target * y
    # y = (Attended - Target * Conducted) / Target
    
    bunks = 0
    if current_percent >= data.target_percent:
        bunks = (data.attended - (target_decimal * data.conducted)) / target_decimal
        bunks = max(0, int(np.floor(bunks)))
        
    return {
        "current_percent": rounded_score(current_percent),
        "classes_needed_for_target": needed,
        "safe_bunks_available": bunks
    }

@app.post("/chat")
def chat_assistant(data: ChatRequest):
    msg = data.message.lower()
    subj = data.subject_name
    att = data.attendance_percent
    
    # Detect if user is speaking Hindi
    is_hindi = any("\u0900" <= char <= "\u097F" for char in data.message)
    
    if "attendance" in msg or "classes" in msg or "bunk" in msg:
        if att < 75:
            if is_hindi:
                response = f"आपकी {subj} में उपस्थिति {att}% है, जो 75% से कम है। कृपया नियमित रूप से क्लास जाएँ।"
            else:
                response = f"Your {subj} attendance is {att}%, which is below the 75% threshold. You should prioritize attending upcoming sessions."
        else:
            if is_hindi:
                response = f"आपकी {subj} में उपस्थिति {att}% है, जो अच्छी है!"
            else:
                response = f"Your {subj} attendance is solid at {att}%. You have some breathing room!"
    elif "hindi" in msg or ("english" not in msg and is_hindi):
        response = f"नमस्ते! मैं आपका डिजिटल ट्विन हूँ। मैं आपकी सहायता के लिए यहाँ हूँ।"
    elif "score" in msg or "marks" in msg or "exam" in msg:
        if data.predicted_score:
            if is_hindi:
                response = f"आपकी आदतों के आधार पर, हम {subj} में {data.predicted_score}% स्कोर का अनुमान लगाते हैं। मेहनत करते रहें!"
            else:
                response = f"Based on your habits, we project a {data.predicted_score}% score in {subj}. Keep working hard!"
        else:
            response = f"I'll need more study habit data to predict your {subj} score accurately." if not is_hindi else f"सटीक स्कोर के लिए मुझे और डेटा चाहिए।"
    else:
        if is_hindi:
            response = "मैं आपकी कैसे मदद कर सकता हूँ?"
        else:
            response = "I am your Digital Twin. I am here to help you."

    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
