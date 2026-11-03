// 渲染进程：负责"悬停判断 + 穿透开关 + 拖拽"
// 关键点：整窗默认穿透，只有鼠标进入角色范围时才关掉穿透

const pet = document.getElementById("pet");

let ignoring = true; // 当前是否处于穿透状态
let hovering = false; // 鼠标是否在角色身上
let dragging = false;

function pointInPet(x, y) {
  const r = pet.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function setIgnore(next) {
  if (next === ignoring) return;
  ignoring = next;
  window.pet.ignore(next);
}

// 鼠标移动：判断在不在角色上，据此切换穿透
window.addEventListener("mousemove", (e) => {
  if (dragging) {
    window.pet.dragMove({ x: e.screenX, y: e.screenY });
    return;
  }

  hovering = pointInPet(e.clientX, e.clientY);
  setIgnore(!hovering);
});

// 按下：开始拖拽（此时穿透已关闭，点击能落到角色上）
window.addEventListener("mousedown", (e) => {
  if (!hovering || dragging) return;
  dragging = true;
  pet.classList.add("dragging");
  window.pet.dragStart({ x: e.screenX, y: e.screenY });
});

// 松开：结束拖拽，立刻恢复"离开即穿透"的判断
window.addEventListener("mouseup", () => {
  if (!dragging) return;
  dragging = false;
  pet.classList.remove("dragging");
  window.pet.dragEnd();
});
