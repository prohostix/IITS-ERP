const docs = ["{\"name\":\"10th\",\"url\":\"/uploads/...\"}"];
const parsed = docs.map(d => typeof d === 'string' ? JSON.parse(d) : d);
console.log(parsed);
