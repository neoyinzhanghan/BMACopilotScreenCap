from flask import Flask, render_template, request, jsonify
from process_region import save_screenshot

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/save-screenshot', methods=['POST'])
def handle_screenshot():
    data = request.json
    result = save_screenshot(data['image'])
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)