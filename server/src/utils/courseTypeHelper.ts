export const mapFrontendToPrismaCourseType = (type: string): string => {
  switch (type) {
    case 'Skill Course': return 'SkillCourse';
    case 'Online Degree': return 'OnlineDegree';
    case 'B.Voc Degree': return 'BVocDegree';
    case 'Credit Transfer': return 'CreditTransfer';
    default: return type;
  }
};

export const mapPrismaToFrontendCourseType = (type: string): string => {
  switch (type) {
    case 'SkillCourse': return 'Skill Course';
    case 'OnlineDegree': return 'Online Degree';
    case 'BVocDegree': return 'B.Voc Degree';
    case 'CreditTransfer': return 'Credit Transfer';
    default: return type;
  }
};
