// 渲染进程：只负责拖拽。
// 穿透开关已移到主进程（轮询光标位置判断），页面不再参与。

const pet = document.getElementById("pet");

let dragging = false;

window.addEventListener("mousedown", (e) => {
  if (dragging) return;
  dragging = true;
  pet.classList.add("dragging");
  window.pet.dragStart({ x: e.screenX, y: e.screenY });
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  window.pet.dragMove({ x: e.screenX, y: e.screenY });
});

window.addEventListener("mouseup", () => {
  if (!dragging) return;
  dragging = false;
  pet.classList.remove("dragging");
  window.pet.dragEnd();
});
