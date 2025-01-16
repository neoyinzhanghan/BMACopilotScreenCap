from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
from process_region import save_screenshot

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/save-screenshot', methods=['POST'])
def handle_screenshot():
    data = request.json
    result = save_screenshot(data['image'])
    return jsonify(result)

if __name__ == '__main__':
    socketio.run(app, debug=True)