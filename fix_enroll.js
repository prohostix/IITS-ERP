const fs = require('fs');
const file = 'client/src/components/panels/EnrollStudentPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(method === 'full_payment'\) \{[\s\S]*?\} else \{[\s\S]*?subtotal = fs\.baseFee \+ additionalFeesTotal;[\s\S]*?\}/g;

const replacement = `if (method === 'full_payment') {
        let allSemAdditionalFees = 0;
        breakdowns.forEach((b: any) => {
          if (Array.isArray(b.additionalFees)) {
            allSemAdditionalFees += b.additionalFees.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);
          }
        });
        
        const fullFee = Number((fs as any).fullProgramFee || 0);
        if (fullFee > 0) {
          subtotal = fullFee + additionalFeesTotal + allSemAdditionalFees;
        } else {
          const examFees = breakdowns.reduce((sum: number, b: any) => sum + Number(b.examFee || 0), 0);
          const baseFees = breakdowns.reduce((sum: number, b: any) => sum + Number(b.baseFee || 0), 0);
          subtotal = baseFees + examFees + additionalFeesTotal + allSemAdditionalFees;
        }
      } else {
        const b = breakdowns[0];
        let sem1AdditionalFees = 0;
        if (Array.isArray(b.additionalFees)) {
          sem1AdditionalFees = b.additionalFees.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);
        }
        subtotal = Number(b.baseFee || 0) + Number(b.examFee || 0) + additionalFeesTotal + sem1AdditionalFees;
      }
    } else {
      subtotal = fs.baseFee + additionalFeesTotal;
    }`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content);
