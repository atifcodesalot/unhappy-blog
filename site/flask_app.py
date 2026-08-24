

from flask import *

app = Flask(__name__)


CHAPTERS = [
    "intro",
    "introduction",
    "projective-geometry",
    "affine-transformations",
    "lines-and-projections",
    "model-view-transformations",
    "perspective-correct-interpolation",
    "view-frustum",
    "rasterization",
    "shading"
]

@app.route("/baskan03321_")
def baskan():
    return render_template("baskan.html")

@app.route("/graphics_legacy")
def graphics():
    return render_template("cg.html")


@app.route("/cow")
def cow():
    return send_from_directory("static", "models/cow.obj")

@app.route("/diamond")
def diamond():
    return send_from_directory("static", "diamond.obj")

@app.route("/")
def index():
    return redirect("/intro")

@app.route('/<path:path>', methods=['GET'])
def catch_all(path):
    if path in CHAPTERS:    
        return render_template(f"{path}.html")
    else:
        abort(404)


if __name__ == "__main__":
    app.run("localhost", 8000)
