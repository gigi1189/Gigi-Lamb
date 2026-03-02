const clickSound = new Audio('Sounds/click.mp3');
const hoverSound = new Audio('Sounds/Hover.mp3');

function playClick() {
    clickSound.currentTime = 0;
    clickSound.play();
}

function minimizePlayer() {
    document.querySelector(".music-player").style.display = "none";
    document.querySelector(".slim-music-player").style.display = "flex";
}
function maximizePlayer() {
    document.querySelector(".music-player").style.display = "block";
    document.querySelector(".slim-music-player").style.display = "none";
}

function toggleMusic() {
    const audio = window.frames["musicFrame"].document.querySelector("audio");

    if (audio.paused) {
        audio.play();
        document.querySelector(".player-btn").innerHTML = "II";
    } else {
        audio.pause();
        document.querySelector(".player-btn").innerHTML = "▶";
    };
}

tsParticles.load("tsparticles", {
    interactivity: {
        events: {
            onClick: {
                enable: true,
                mode: "push"
            },
            onHover: {
                enable: true,
                mode: "repulse"
            }
        },
        modes: {
            push: {
                quantity: 10
            },
            repulse: {
                distance: 200
            }
        }
    },
    particles: {
        color: {
            value: "#dbbf7e9c"
        },
        move: {
            enable: true
        },
        opacity: {
            value: { min: 0, max: .7 }
        },
        size: {
            value: { min: 0.5, max: 2.5 }
        }
    }
});


function playHoverSound() {
    hoverSound.currentTime = 0;
    hoverSound.play();
}

function showPjct(num) {

    document.querySelectorAll(".pjct").forEach(el => {
        el.style.display = "none";
    });

    document.querySelectorAll(".red-light").forEach(el => {
        el.style.display = "none";
    });

    document.querySelector(`.pjct-${num === 1 ? "one" :
        num === 2 ? "two" :
            num === 3 ? "three" :
                num === 4 ? "four" :
                    num === 5 ? "five" :
                        num === 6 ? "six" : "seven"}`).style.display = "block";

    document.querySelector(`.light-${num === 1 ? "one" :
        num === 2 ? "two" :
            num === 3 ? "three" :
                num === 4 ? "four" :
                    num === 5 ? "five" :
                        num === 6 ? "six" : "seven"}`).style.display = "block";
}

function showOption(num) {
  const options = document.querySelectorAll(".option");

  options.forEach(opt => {
    opt.style.display = "none";
  });

  let optionId = "";
  if (num == 1) optionId = "option-1";
  else if (num == 2) optionId = "option-2";
  else if (num == 3) optionId = "option-3";
  else optionId = "option-4";

  const option = document.getElementById(optionId);
 option.style.display = "block";
}