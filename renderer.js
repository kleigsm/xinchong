console.log("[renderer] loaded, api=" + typeof window.pet);

// 渲染进程：只负责拖拽。
// 穿透开关已移到主进程（轮询光标位置判断），页面不再参与。
//
// 注意：preload 通过 contextBridge 暴露了 window.pet，
// 所以这里不能再用 const pet 命名，否则会 SyntaxError 导致整个脚本不执行。

const petEl = document.getElementById("pet");

let dragging = false;

window.addEventListener("mousedown", (e) => {
  if (dragging) return;
  dragging = true;
  petEl.classList.add("dragging");
  window.pet.dragStart({ x: e.screenX, y: e.screenY });
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  window.pet.dragMove({ x: e.screenX, y: e.screenY });
});

window.addEventListener("mouseup", () => {
  if (!dragging) return;
  dragging = false;
  petEl.classList.remove("dragging");
  window.pet.dragEnd();
});
