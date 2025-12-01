// База даних щоденних тестів на основі Universal Declaration of Human Rights
export const dailyTestQuestions = {
  day1: [
    {
      id: 1,
      question: "What is the fundamental principle of human rights according to Article 1 of the Universal Declaration?",
      options: [
        "All human beings are born free and equal in dignity and rights",
        "Only citizens have rights in their country",
        "Rights are granted by the government",
        "Human rights depend on social status"
      ],
      correct: 0,
      article: "Article 1"
    },
    {
      id: 2,
      question: "Which article of the Universal Declaration states that everyone has the right to life, liberty and security of person?",
      options: ["Article 1", "Article 3", "Article 5", "Article 10"],
      correct: 1,
      article: "Article 3"
    },
    {
      id: 3,
      question: "What does Article 4 of the Universal Declaration explicitly prohibit?",
      options: [
        "Freedom of speech",
        "Slavery and servitude in all forms",
        "Right to education",
        "Freedom of movement"
      ],
      correct: 1,
      article: "Article 4"
    },
    {
      id: 4,
      question: "According to Article 5, no one shall be subjected to:",
      options: [
        "Free education",
        "Torture or cruel, inhuman or degrading treatment",
        "Employment opportunities",
        "Healthcare services"
      ],
      correct: 1,
      article: "Article 5"
    },
    {
      id: 5,
      question: "Which article guarantees the right to recognition everywhere as a person before the law?",
      options: ["Article 6", "Article 12", "Article 16", "Article 20"],
      correct: 0,
      article: "Article 6"
    },
    {
      id: 6,
      question: "What does Article 7 state about equality before the law?",
      options: [
        "Some people are more equal than others",
        "All are equal before the law and entitled to equal protection against discrimination",
        "Laws apply differently to different social classes",
        "Equality depends on economic status"
      ],
      correct: 1,
      article: "Article 7"
    },
    {
      id: 7,
      question: "Which article protects everyone against arbitrary arrest, detention or exile?",
      options: ["Article 8", "Article 9", "Article 11", "Article 13"],
      correct: 1,
      article: "Article 9"
    },
    {
      id: 8,
      question: "What right is guaranteed by Article 10?",
      options: [
        "Right to fair and public hearing by independent tribunal",
        "Right to privacy",
        "Right to nationality",
        "Right to social security"
      ],
      correct: 0,
      article: "Article 10"
    },
    {
      id: 9,
      question: "According to Article 11, everyone charged with penal offence has the right to be presumed:",
      options: [
        "Wealthy until proven poor",
        "Innocent until proved guilty according to law",
        "Guilty until proven innocent",
        "Educated until proven otherwise"
      ],
      correct: 1,
      article: "Article 11"
    },
    {
      id: 10,
      question: "Which article states that no one shall be subjected to arbitrary interference with privacy, family, home or correspondence?",
      options: ["Article 12", "Article 14", "Article 18", "Article 21"],
      correct: 0,
      article: "Article 12"
    }
  ],
  day2: [
    {
      id: 11,
      question: "What does Article 13 guarantee regarding freedom of movement?",
      options: [
        "Freedom of movement within borders and right to leave/return to any country",
        "Only movement within one's own city",
        "Movement restricted to economic zones",
        "No right to return to one's country"
      ],
      correct: 0,
      article: "Article 13"
    },
    {
      id: 12,
      question: "Which article protects the right to seek and enjoy asylum from persecution in other countries?",
      options: ["Article 14", "Article 16", "Article 19", "Article 22"],
      correct: 0,
      article: "Article 14"
    },
    {
      id: 13,
      question: "What right is guaranteed by Article 15?",
      options: [
        "Right to a nationality and freedom to change it",
        "Right to property",
        "Right to work",
        "Right to healthcare"
      ],
      correct: 0,
      article: "Article 15"
    },
    {
      id: 14,
      question: "According to Article 16, men and women have what rights regarding marriage and family?",
      options: [
        "Equal rights to marriage, during marriage and at its dissolution",
        "Business ownership only",
        "Political participation only",
        "Educational opportunities only"
      ],
      correct: 0,
      article: "Article 16"
    },
    {
      id: 15,
      question: "Which article protects everyone's right to freedom of thought, conscience and religion?",
      options: ["Article 18", "Article 19", "Article 20", "Article 21"],
      correct: 0,
      article: "Article 18"
    },
    {
      id: 16,
      question: "What does Article 19 guarantee regarding freedom of expression?",
      options: [
        "Freedom to hold opinions and seek/receive/impart information through any media",
        "Right to housing",
        "Right to rest and leisure",
        "Right to social security"
      ],
      correct: 0,
      article: "Article 19"
    },
    {
      id: 17,
      question: "Which article protects the right to freedom of peaceful assembly and association?",
      options: ["Article 20", "Article 22", "Article 23", "Article 25"],
      correct: 0,
      article: "Article 20"
    },
    {
      id: 18,
      question: "What right is established in Article 21 regarding participation in government?",
      options: [
        "Right to take part in government directly or through freely chosen representatives",
        "Right to education",
        "Right to cultural life",
        "Right to fair working conditions"
      ],
      correct: 0,
      article: "Article 21"
    },
    {
      id: 19,
      question: "According to Article 22, everyone is entitled to realization of economic, social and cultural rights through:",
      options: [
        "National effort and international cooperation",
        "Free transportation",
        "Government housing only",
        "Business loans"
      ],
      correct: 0,
      article: "Article 22"
    },
    {
      id: 20,
      question: "Which article guarantees the right to work, to free choice of employment, and to protection against unemployment?",
      options: ["Article 23", "Article 24", "Article 25", "Article 26"],
      correct: 0,
      article: "Article 23"
    }
  ],
  // Додаткові дні можна додавати тут...
  day3: [
    // 10 питань для дня 3...
  ]
};

// Допоміжні функції для роботи з тестами
export const getDailyTestQuestions = (dayNumber) => {
  const dayKey = `day${Math.min(dayNumber, Object.keys(dailyTestQuestions).length)}`;
  return dailyTestQuestions[dayKey] || dailyTestQuestions.day1;
};

export const getTotalAvailableDays = () => {
  return Object.keys(dailyTestQuestions).length;
};

export const shuffleQuestions = (questions) => {
  return questions
    .sort(() => Math.random() - 0.5)
    .map(question => ({
      ...question,
      options: [...question.options].sort(() => Math.random() - 0.5)
    }));
};