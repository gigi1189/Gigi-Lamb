const clickSound = new Audio('Sounds/Submarine.mp3');
function playClick() {
    clickSound.currentTime = 0; 
    clickSound.play();
}

function minimizePlayer(){
    document.querySelector(".music-player").style.display = "none";
    document.querySelector(".slim-music-player").style.display="flex";
}
function maximizePlayer(){
    document.querySelector(".music-player").style.display = "block";
    document.querySelector(".slim-music-player").style.display="none";
}

function toggleMusic(){
    const audio = window.frames["musicFrame"].document.querySelector("audio");

    if (audio.paused){
    audio.play();
    document.querySelector(".player-btn").innerHTML = "II";
    }else{
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
