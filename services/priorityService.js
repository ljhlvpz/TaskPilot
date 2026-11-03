// Copy this to D:\TaskPilot\services\priorityService.js
// priorityModel.json must be alongside this file.
import model from './priorityModel.json';

function parseDueDate(task) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(task.dueDate || '')) ? task.dueDate : null;
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const result = new Date(y, m - 1, d);
  if (result.getFullYear() !== y || result.getMonth() !== m - 1 || result.getDate() !== d) return null;
  return result;
}

export function predictTaskPriority(task, now = new Date()) {
  if (task.completed) return null;
  const due = parseDueDate(task);
  if (!due) return null; // Don't guess if due date is missing.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  const importance = Number(task.importance);
  const duration = Number(task.estimatedMinutes);
  if (!Number.isFinite(importance) || importance < 1 || importance > 5 ||
      !Number.isFinite(duration) || duration < 15 || duration > 240) return null;
  const features = [Math.max(-1, Math.min(30, days)), importance, duration, Number(days < 0)];
  const scaled = features.map((v,i) => (v-model.mean[i])/model.scale[i]);
  const logits = model.weights.map((row,k) => row.reduce((s,w,i)=>s+w*scaled[i],model.bias[k]));
  const peak = Math.max(...logits);
  const exp = logits.map(v => Math.exp(v-peak));
  const total = exp.reduce((a,b)=>a+b,0);
  const probs = exp.map(v=>v/total);
  const winner = probs.indexOf(Math.max(...probs));
  return { priority:model.classes[winner], confidence:probs[winner],
    probabilities:Object.fromEntries(model.classes.map((label,i)=>[label,probs[i]])),
    modelVersion:model.version };
}
