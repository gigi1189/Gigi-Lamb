const images = [
  { src: "Pics/Gallery/b.gif",
    title: "b.gif",
    description: "cute girl",
    link: ""
  },
  { src: "Pics/GigiwG4.png",
    title: "GigiwG4.png",
    description: "Me on my puter!",
    link: ""
  },
  { src: "Pics/Gallery/fist.gif",
    title: "fist.gif",
    description: "cool tattoed hand gif",
    link: ""
  },
  { src: "Pics/Gallery/suckmonscreen.gif",
    title: "suckmonscreen.gif",
    description: "foxy lady.. what is she saying?",
    link: "https://windows93.net/"
  },
  { src: "Pics/Gallery/tora.png",
    title: "tora.png",
    description: "cute tiger!",
    link: "http://maltinerecords.cs8.biz/"
  },
  { src: "Pics/Gallery/ChinaTown.png",
    title: "ChinaTown.png",
    description: "beautiful lights",
    link: ""
  },  
  { src: "Pics/Gallery/cutiebadbad.gif",
    title: "cutiebadbad.gif",
    description: "this gif is so brat. she was ahead of her time",
    link: "https://web.archive.org/web/20091027032032/http://www.geocities.com/cutiebadbad/Icon/wf.gif"
  },
  { src: "Pics/Gallery/tech.gif",
    title: "tech.gif",
    description: "cute lantern",
    link: "https://web.archive.org/web/20091020084320/http://geocities.com/Heartland/Farm/9327/snowe/demo.htm"
  },
  { src: "Pics/Gallery/MdrnDyArmr.png",
    title: "MdrnDyArmr.png",
    description: "Me and Che for Modern Day Armor",
    link: ""
  },
  { src: "Pics/HandsPLACEHOLDER.png",
    title: "HandsPLACEHOLDER.png",
    description: "Whoops. not a placeholder anymore!",
    link: "https://sabrin.party/"
  },
  { src: "Pics/Orchid.png",
    title: "orchid.png",
    description: "Pretty orchid",
    link: ""
  },
  { src: "Pics/Gallery/imac.png",
    title: "imac.png",
    description: "iMac G4 - my otp",
    link: "https://altalenae.neocities.org/shrines/nostalgia"
  },
  { src: "Pics/Gallery/Chakusin.jpg",
    title: "Chakusin.jpg",
    description: "Cute cat CD. Wonder what it sounds like...",
    link: ""
   },
  { src: "Pics/Gallery/pikachu-popstar.gif",
    title: "pikachu-popstar.gif",
    description: "Gen 1 3D model of Pikachu popstar outfit! Sooo cute!!",
    link: "https://projectpokemon.org/home/docs/spriteindex_148/3d-models-generation-1-pok%C3%A9mon-r90/"
  },
  { src: "Pics/Gallery/wocao.jpg",
    title: "wocao.jpg",
    description: "mysterious image i found after googling what wo cao meant. can anyone translate?",
    link: ""
  },
  { src: "Pics/Gallery/perch.png",
    title: "perch.png",
    description: "mysterious image that's lived on my google drive since 2020. not sure where from",
    link: ""
  },
  { src: "Pics/Gallery/hello-kitty.gif",
    title: "hello-kitty.gif",
    description: "gif my ex sent me to edit into my youtube videos. Still cute! :p ",
    link: ""
  },
  { src: "Pics/Gallery/AlienChicks.png",
    title: "AlienChicks.png",
    description: "me and my cute cousin being aliens for halloween",
    link: ""
  },
  { src: "Pics/Gallery/anime.jpg",
    title: "anime.jpg",
    description: "this was generated ~2021 by dall e mini after I requested 'anime spider girl'",
    link: "alltheartistsaistealsfrom.com" 
  },
  { src: "Pics/Gallery/sy.jpg",
    title: "sy.jpg",
    description: "Delicate, interesting magazine I found on old geocities shop",
    link: ""
  },
  { src: "Pics/Gallery/friends.jpg",
    title: "friends.jpg",
    description: "I love you guys",
    link: ""
  },
  { src: "Pics/Gallery/head.gif",
    title: "head.gif",
    description: "You spin me right round baby, right round Like a record, baby, right round, round, round You spin me right round baby, right round Like a record, baby, right round, round, round",
    link: ""
  },
  { src: "Pics/Gallery/parasol.png",
    title: "parasol",
    description: "my perfect parasol",
    link: ""
  },
  { src: "Pics/Gallery/Nicki.png",
    title: "Nicki.png",
    description: "maga minaj",
    link: "https://windows93.net/"
  }
];
const container = document.getElementById("container");
const infoDiv = document.getElementById("img-info");

images.forEach(img => {
  const div = document.createElement("div");

  div.classList.add("item");
  div.style.backgroundImage = `url('${img.src}')`;

  div.addEventListener("dblclick", (e) => {
    e.stopPropagation(); 
    showImgInfo(img);
  });

  container.appendChild(div);
});

function showImgInfo(imgData) {
  infoDiv.innerHTML = `
    <img src="${imgData.src}" style="height:60%; margin:30px;">
    <h3>${imgData.title || ""}</h3>
    <p>${imgData.description || ""}</p>
    ${imgData.link ? `<a href="${imgData.link}" target="_blank" rel="noopener noreferrer">visit</a>` : ""}
  `;
  infoDiv.style.display = "block";
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".item") && !e.target.closest("#img-info")) {
    infoDiv.style.display = "none";
  }
});

const items = document.querySelectorAll(".item");

items.forEach((dragItem) => {

  let active = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  dragItem.addEventListener("mousedown", dragStart);
  dragItem.addEventListener("mouseup", dragEnd);
  dragItem.addEventListener("mousemove", drag);

  dragItem.addEventListener("touchstart", dragStart);
  dragItem.addEventListener("touchend", dragEnd);
  dragItem.addEventListener("touchmove", drag);

  function dragStart(e) {
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }
    active = true;
  }

  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    active = false;
  }

  function drag(e) {
    if (!active) return;

    e.preventDefault();

    if (e.type === "touchmove") {
      currentX = e.touches[0].clientX - initialX;
      currentY = e.touches[0].clientY - initialY;
    } else {
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
    }

    xOffset = currentX;
    yOffset = currentY;

    dragItem.style.transform =
      `translate3d(${currentX}px, ${currentY}px, 0)`;
  }

});

function toggleInfo() {
  const info = document.getElementById("info-box");

  if (info.style.display == "block") {
    info.style.display = "none";
  } else {
    info.style.display = "block";
  }
}
function toggleTheme() {
  const theme = document.getElementById("theme-box");

  if (theme.style.display == "block") {
    theme.style.display = "none";
  } else {
    theme.style.display = "block";
  }
}

function changeTheme(theme){
  const bg = document.getElementById("gallery-body");

  if (theme === "dark"){
    bg.style.background = "#261a23";
  } else if (theme === "kawaii"){
    bg.style.background = "url('Pics/Kawaii-Theme.png')";
  } else if (theme === "windows"){
    bg.style.background = "url('Pics/Windows-Theme.jpg')";
    bg.style.backgroundSize = "105%";
  } else if (theme === "scary"){
    bg.style.background = "url('Pics/Scary-Theme.jpg')";
    bg.style.backgroundSize = "Contain";
  } else if (theme === "gigi"){
    bg.style.background = "url('Pics/Gigi-Theme.jpg')";
    bg.style.backgroundSize = "Contain";
  }
  else if (theme === "light") {
    bg.style.background = "white";
  } 
}