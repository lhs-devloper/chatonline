let intervalTime = localStorage.getItem("alarmInterval")
  ? localStorage.getItem("alarmInterval")
  : 2000;
function saveInterval() {
  const alarmInterval = document.getElementById("alarmInterval");
  localStorage.setItem("alarmInterval", alarmInterval.value);
  intervalTime = alarmInterval.value;
}
function isIOSSafari() {
  const ua = window.navigator.userAgent;
  return (
    /iP(ad|hone|od)/.test(ua) &&
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/.test(ua)
  );
}
if (
  (navigator.userAgent.indexOf("Windows") !== -1 ||
    navigator.userAgent.indexOf("Mac") !== -1) &&
  !isIOSSafari()
) {
  Notification.requestPermission().then(function (result) {
    console.log(result);
  });
}

const socket = io();
let username = "";

function getUsername() {
  username = "";
  while (!username) {
    username = prompt("사용자 이름을 입력하세요:");
  }
  socket.emit("join", username);
}

getUsername();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

input.addEventListener("paste", (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.indexOf("image") !== -1) {
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = function (event) {
        socket.emit("chatImage", { image: event.target.result });
      };
      reader.readAsDataURL(blob);
      e.preventDefault();
    }
  }
});

input.addEventListener("keydown", function (event) {
  if (event.isComposing) return; // 조합 중이면 무시
  if (event.key === "Enter" && !event.shiftKey) {
    const message = input.innerText.replace(/\n/g, "<br>");
    if (message.trim()) {
      socket.emit("chat message", message);
      input.innerText = "";
    }
    event.preventDefault();
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = input.innerText.replace(/\n/g, "<br>");
  if (message.trim()) {
    socket.emit("chat message", message);
    input.innerText = "";
  }
});

socket.on("chat message", (msg) => {
  const item = document.createElement("li");
  if (msg.username === username) {
    item.classList.add("my-message");
  } else {
    item.classList.add("other-message");
  }

  const time = new Date(msg.timestamp);
  const year = time.getFullYear();
  const month = (time.getMonth() + 1).toString().padStart(2, "0");
  const day = time.getDate().toString().padStart(2, "0");
  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const timestamp = `${year}/${month}/${day} ${hours}:${minutes}`;

  if (msg.image) {
    const strong = document.createElement("strong");
    strong.textContent = msg.username;

    const span = document.createElement("span");
    const img = document.createElement("img");
    img.src = msg.image;
    img.addEventListener("click", () => {
      const modal = document.getElementById("imageModal");
      const modalImg = document.getElementById("modalImage");
      modal.style.display = "block";
      modalImg.src = img.src;
    });
    span.appendChild(img);

    const timestampSpan = document.createElement("span");
    timestampSpan.className = "timestamp";
    timestampSpan.textContent = timestamp;

    item.appendChild(strong);
    item.appendChild(span);
    item.appendChild(timestampSpan);
  } else {
    const linkified = msg.message.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    item.innerHTML = `<strong>${msg.username}</strong><span>${linkified}</span><span class='timestamp'>${timestamp}</span>`;
    if (
      navigator.userAgent.indexOf("Windows") !== -1 ||
      navigator.userAgent.indexOf("Mac") !== -1
    ) {
      if (isIOSSafari()) {
        const notification = new Notification("PIBS", { body: msg.message });
        setTimeout(() => {
          notification.close();
        }, intervalTime);
      } else {
        const notification = new Notification("PIBS", { body: msg.message });
        setTimeout(() => {
          notification.close();
        }, intervalTime);
      }
    }
  }
  messages.appendChild(item);
  scrollToBottomIfNeeded();
  toggleScrollButton();
});

function scrollToBottomIfNeeded() {
  const scrollThreshold = 100; // pixels from the bottom
  const isNearBottom =
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - scrollThreshold;
  if (isNearBottom) {
    window.scrollTo(0, document.body.scrollHeight);
  }
}

// Function to show/hide the scroll to bottom button
function toggleScrollButton() {
  const scrollToBottomBtn = document.getElementById("scrollToBottomBtn");
  if (!scrollToBottomBtn) return; // Ensure button exists

  if (
    document.body.scrollHeight > window.innerHeight &&
    window.innerHeight + window.scrollY < document.body.scrollHeight
  ) {
    scrollToBottomBtn.classList.add("show");
  } else {
    scrollToBottomBtn.classList.remove("show");
  }
}

socket.on("userJoined", (msg) => {
  const item = document.createElement("li");
  item.textContent = msg;
  item.style.textAlign = "center";
  item.style.color = "gray";
  messages.appendChild(item);
  scrollToBottomIfNeeded();
  toggleScrollButton();
});

socket.on("userLeft", (msg) => {
  const item = document.createElement("li");
  item.textContent = msg;
  item.style.textAlign = "center";
  item.style.color = "gray";
  messages.appendChild(item);
  scrollToBottomIfNeeded();
  toggleScrollButton();
});

socket.on("userList", (userList) => {
  updateParticipants(userList);
});

socket.on("duplicateUsername", () => {
  alert("이미 사용중인 닉네임입니다. 다른 닉네임을 입력해주세요.");
  getUsername();
});

const hamburgerBtn = document.getElementById("hamburgerBtn");
const participantsPanel = document.getElementById("participantsPanel");
const participantsList = document.getElementById("participantsList");

hamburgerBtn.addEventListener("click", () => {
  if (participantsPanel.style.right === "0px") {
    participantsPanel.style.right = "-250px"; // 숨기기
  } else {
    participantsPanel.style.right = "0px"; // 보이기
  }
});

function updateParticipants(users) {
  participantsList.innerHTML = "";
  if (users.length === 0) {
    participantsList.innerHTML = "<li>참가자가 없습니다.</li>";
    return;
  }
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    participantsList.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("imageModal");

  if (modal) {
    const span = document.getElementsByClassName("close")[0];

    if (span) {
      span.onclick = function () {
        modal.style.display = "none";
      };
    }

    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  }

  const requestNotificationBtn = document.getElementById(
    "requestNotificationBtn"
  );

  if (isIOSSafari()) {
    if (requestNotificationBtn) {
      requestNotificationBtn.style.display = "block";
      requestNotificationBtn.addEventListener("click", () => {
        Notification.requestPermission().then(function (result) {
          if (result === "granted") {
            alert("알림이 허용되었습니다.");
          } else {
            alert("알림이 거부되었습니다.");
          }
        });
      });
    }
  }

  const scrollToBottomBtn = document.getElementById("scrollToBottomBtn");

  if (scrollToBottomBtn) {
    scrollToBottomBtn.addEventListener("click", () => {
      console.log("Scroll to Bottom button clicked!");
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  // Also call it initially and whenever new messages arrive
  toggleScrollButton(); // Initial check
});
