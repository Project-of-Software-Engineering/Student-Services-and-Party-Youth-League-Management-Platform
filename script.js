const qa = [
  {
    keys: ["奖学金", "荣誉"],
    answer: "奖学金申请通常需要成绩证明、获奖材料、个人申请表和班级公示记录。管理员可在知识库中维护材料清单和模板。"
  },
  {
    keys: ["请假", "审批"],
    answer: "请假申请需要填写时间、原因和佐证材料，提交后经过辅导员审核，必要时进入学院领导终审。"
  },
  {
    keys: ["入党", "党团", "流程"],
    answer: "入党流程包含入党申请、团组织推优、积极分子培养、发展对象考察、预备党员接收和转正等阶段。"
  }
];

const steps = [
  ["入党申请书提交", "2026-03-08 已归档", "done"],
  ["团支部推优", "2026-03-22 已完成", "done"],
  ["积极分子培养", "当前阶段：需参加第 4 次党课", "current"],
  ["发展对象考察", "预计 2026-06 开始", ""],
  ["预备党员接收", "等待前置材料完成", ""]
];

const approvals = [
  ["李明", "在读证明", "辅导员待审核"],
  ["周晴", "请假申请", "学院终审"],
  ["王浩", "党课结业证明", "材料待补充"]
];

const notices = [
  ["党团材料核对", "面向：入党积极分子，截止：本周五"],
  ["奖学金申请提醒", "面向：2023级软件工程，截止：5月18日"],
  ["学生画像维护", "面向：全体学生，请补充荣誉记录"]
];

const logs = [
  "09:18 教师管理员导入学生基础信息.xlsx",
  "09:32 系统记录李明提交在读证明申请",
  "10:05 超级管理员调整团支书数据维护权限",
  "10:24 学院领导查看本月审批统计"
];

const roleNames = {
  student: "学生：李明",
  admin: "教师管理员：陈老师",
  leader: "学院领导：张老师"
};

function renderTimeline() {
  const timeline = document.querySelector("#timeline");
  timeline.innerHTML = steps
    .map(([title, desc, cls]) => `<li class="${cls}"><i></i><div><strong>${title}</strong><span>${desc}</span></div></li>`)
    .join("");
}

function renderApprovals() {
  document.querySelector("#approvalRows").innerHTML = approvals
    .map(([name, item, status]) => `<tr><td>${name}</td><td>${item}</td><td>${status}</td><td><button data-approve="${name}">通过</button></td></tr>`)
    .join("");
}

function renderNotices() {
  document.querySelector("#studentNotices").innerHTML = notices
    .map(([title, desc]) => `<div class="notice-card"><strong>${title}</strong><span>${desc}</span></div>`)
    .join("");
}

function renderLogs() {
  document.querySelector("#logList").innerHTML = logs.map((log) => `<li>${log}</li>`).join("");
}

function askQuestion() {
  const value = document.querySelector("#questionInput").value.trim();
  const found = qa.find((item) => item.keys.some((key) => value.includes(key)));
  document.querySelector("#answerBox").textContent = found
    ? found.answer
    : "知识库暂未命中完全匹配条目，已为你展示默认办理说明：请联系辅导员确认材料要求，管理员可在后台补充问答。";
}

document.querySelectorAll(".nav button").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    document.querySelectorAll(".nav button").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${view}`).classList.add("active");
    document.querySelector("#roleName").textContent = roleNames[view];
  });
});

document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.scroll}`).scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelector("#askBtn").addEventListener("click", askQuestion);
document.querySelector("#questionInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") askQuestion();
});

document.querySelector("#applyForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  document.querySelector("#applyResult").textContent = `最近申请：${data.get("type")}，已提交至辅导员审核，系统已生成操作日志。`;
  logs.unshift(`刚刚 学生提交${data.get("type")}申请`);
  renderLogs();
});

document.querySelector("#noticeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  notices.unshift(["新通知", `面向：${data.get("target")}，内容：${data.get("content")}`]);
  logs.unshift(`刚刚 教师管理员向${data.get("target")}发布通知`);
  renderNotices();
  renderLogs();
});

document.querySelector("#importBtn").addEventListener("click", () => {
  document.querySelector("#importResult").textContent = "已模拟导入 1186 条学生数据，并记录导入日志。";
  logs.unshift("刚刚 教师管理员完成 1186 条学生数据导入");
  renderLogs();
});

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-approve]")) {
    const name = event.target.dataset.approve;
    event.target.closest("tr").children[2].textContent = "已通过";
    event.target.disabled = true;
    event.target.textContent = "完成";
    logs.unshift(`刚刚 教师管理员通过${name}的审批申请`);
    renderLogs();
  }
});

renderTimeline();
renderApprovals();
renderNotices();
renderLogs();
askQuestion();
