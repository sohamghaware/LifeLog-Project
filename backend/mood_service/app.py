from flask import Flask, request, jsonify  # type: ignore
from flask_cors import CORS  # type: ignore
from sklearn.linear_model import LogisticRegression  # type: ignore
import numpy as np  # type: ignore

app = Flask(__name__)
CORS(app)

# Dummy training data
# Categories mapping:
# 0: Study, 1: Work, 2: Exercise, 3: Social, 4: Entertainment, 5: Personal, 6: Other
categories = {"Study": 0, "Work": 1, "Exercise": 2, "Social": 3, "Entertainment": 4, "Personal": 5, "Other": 6}

# Features: [category_idx, duration_minutes]
# Labels: "Happy", "Neutral", "Sad", "Stressed"
X_train = np.array([
    [1, 480], # Work 8h -> Stressed
    [2, 60],  # Exercise 1h -> Happy
    [3, 120], # Social 2h -> Happy
    [0, 300], # Study 5h -> Neutral
    [4, 180], # Entertainment 3h -> Happy
    [1, 600], # Work 10h -> Stressed
    [0, 600], # Study 10h -> Sad
    [6, 30],  # Other 30m -> Neutral
    [5, 120]  # Personal 2h -> Happy
])
y_train = np.array([
    "Stressed", "Happy", "Happy", "Neutral", "Happy", "Stressed", "Sad", "Neutral", "Happy"
])

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

@app.route('/predict-mood', methods=['POST'])
def predict_mood():
    try:
        data = request.json
        category = data.get('category', 'Other')
        # Ensure duration is an integer, as it might be sent as a string
        duration = int(data.get('durationMinutes', 0))
        
        cat_idx = categories.get(category, 6)
        
        prediction = model.predict([[cat_idx, duration]])[0]
        
        return jsonify({"predictedMood": prediction})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
