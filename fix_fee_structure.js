const fs = require('fs');
const file = 'client/src/components/panels/ProgramFeeStructurePanel.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `additionalFees: '',`,
  `additionalFees: [] as { id: string; label: string; amount: string }[],`
);

content = content.replace(
  `additionalFees: ''`,
  `additionalFees: [] as { id: string; label: string; amount: string }[]`
);

content = content.replace(
  `additionalFees: b.additionalFees || ''`,
  `additionalFees: Array.isArray(b.additionalFees) ? b.additionalFees.map((f: any, i: number) => ({ id: Date.now().toString() + i, label: f.label, amount: String(f.amount) })) : []`
);

content = content.replace(
  `additionalFees: filteredOtherFees.map(f => \`\${f.label}:\${f.amount}\`).join(', '),`,
  `additionalFees: filteredOtherFees.map((f: any, i: number) => ({ id: Date.now().toString() + i, label: f.label, amount: String(f.amount) })),`
);

content = content.replace(
  `      if (form.additionalFees) {
        const custom = form.additionalFees.split(',').map(s => {
          const [label, amount] = s.trim().split(':');
          return { label: label?.trim(), amount: Number(amount) };
        }).filter(f => f.label && !isNaN(f.amount));
        addFees.push(...custom);
      }`,
  `      if (form.additionalFees && form.additionalFees.length > 0) {
        const custom = form.additionalFees.filter(f => f.label.trim() && !isNaN(Number(f.amount))).map(f => ({ label: f.label.trim(), amount: Number(f.amount) }));
        addFees.push(...custom);
      }`
);

content = content.replace(
  `           additionalFees: b.additionalFees || ''`,
  `           additionalFees: Array.isArray(b.additionalFees) ? b.additionalFees.filter((f: any) => f.label.trim() && !isNaN(Number(f.amount))).map((f: any) => ({ label: f.label.trim(), amount: Number(f.amount) })) : []`
);

fs.writeFileSync(file, content);
