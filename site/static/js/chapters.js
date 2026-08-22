

const CHAPTERS = [
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
];


var CHAPTER_NAME;
var CH_INDEX;


function initChapter() {
    const htmlName = window.location.pathname.split('/').pop();
    const chName = htmlName.split('.').at(0);
    CHAPTER_NAME = chName;
    CH_INDEX = CHAPTERS.indexOf(chName);
}

function initNextPrevChapters() {
    nextCh = document.getElementById("nextCh");
    prevCh = document.getElementById("prevCh");
    if (CH_INDEX === 0) {
        prevCh.style.display = "none";
    } else {
        prevCh.textContent = "⮨ Previous: " + CHAPTERS[CH_INDEX - 1];
    }
    if (CH_INDEX === CHAPTERS.length - 1) {
        nextCh.style.display = "none";
    } else {
        nextCh.textContent = "Next: " + CHAPTERS[CH_INDEX + 1] + " ⮩";
    }
    
    nextCh.addEventListener("click", function() {
        if (CH_INDEX < CHAPTERS.length - 1) {
            window.location.href = CHAPTERS[CH_INDEX + 1];
        }
    });
    prevCh.addEventListener("click", function() {
        if (CH_INDEX > 0) {
            window.location.href = CHAPTERS[CH_INDEX - 1];
        }
        
    });
}

initChapter();
initNextPrevChapters();