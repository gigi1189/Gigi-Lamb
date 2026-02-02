const clickSound = new Audio('Sounds/Submarine.mp3');
function playClick() {
    clickSound.currentTime = 0; // restart from beginning
    clickSound.play();
}
