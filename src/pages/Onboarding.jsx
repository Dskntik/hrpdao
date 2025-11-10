import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FaGraduationCap,
  FaBook,
  FaExclamationTriangle,
  FaCheck,
  FaLink,
  FaArrowRight,
  FaArrowLeft,
  FaShieldAlt,
  FaBalanceScale,
  FaUserShield,
  FaHandsHelping,
  FaGavel,
  FaHeart,
  FaLock,
  FaEye,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Book, AlertTriangle, Check, Link, ArrowRight, ArrowLeft, Users, MapPin, Calendar } from "lucide-react";

function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [testAnswers, setTestAnswers] = useState([]);
  const [testCompleted, setTestCompleted] = useState(false);
  const [agreements, setAgreements] = useState({
    all: false,
  });
  const [linkClicked, setLinkClicked] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const newProgress = (currentStep / (educationContent.length + 1)) * 100;
    setProgress(newProgress);
  }, [currentStep]);

  const welcomeMessage = {
    title: "Welcome to Human Rights Policy DAO",
    text: "Your journey into the world of human rights starts now! Get ready to become part of the revolution in human rights protection through Web3 technologies!",
  };

  const educationContent = [
    {
      icon: Shield,
      title: "What are Human Rights?",
      content:
        "Human rights are fundamental rights and freedoms that belong to every person from birth. These are your basic inalienable rights in society!\n\n• Universal - belong to everyone\n• Inalienable - cannot be taken away\n• Indivisible - all rights are equally important\n• Interdependent - one right supports another\n\nMain categories of rights:\n• Civil rights: life, liberty, security\n• Political rights: participation in governance, freedom of association\n• Socio-economic rights: work, education, healthcare",
    },
    {
      icon: AlertTriangle,
      title: "What Constitutes Human Rights Violations?",
      content:
        "Human rights violations are actions or inactions that limit or deprive people of their fundamental rights.\n\nSpecific examples of violations:\n\n🔴 Censorship:\n• Restriction of freedom of speech\n• Blocking access to information\n• Persecution for expressions\n\n🔴 Torture:\n• Physical violence\n• Psychological pressure\n• Inhuman treatment\n\n🔴 Forced labor:\n• Work without voluntary consent\n• Unfair payment\n• Inability to resign\n\n🔴 Discrimination:\n• Inequality based on gender, race, religion\n• Limited opportunities\n• Denial of services",
    },
    {
      icon: Users,
      title: "How NOT to Violate Others' Rights",
      content:
        "Checklist «Do No Harm» - basic principles of respecting others' rights:\n\n✅ Physical safety:\n• Do not use physical force\n• Respect personal space\n• Do not threaten others' safety\n\n✅ Psychological protection:\n• Avoid insults and contempt\n• Do not manipulate or pressure\n• Respect feelings and beliefs\n\n✅ Financial justice:\n• Do not use fraud\n• Fulfill financial obligations\n• Do not appropriate others' property\n\n✅ Social equality:\n• Do not discriminate on any grounds\n• Provide equal opportunities\n• Respect cultural differences",
    },
    {
      icon: FaHandsHelping,
      title: "How to Protect Your Rights",
      content:
        "Step-by-step guide to protecting your rights:\n\n📋 Step 1: Document\n• Record all violation facts\n• Collect evidence (photos, videos, documents)\n• Record dates, locations, witnesses\n\n📢 Step 2: Report\n• Contact competent authorities\n• Inform human rights organizations\n• Use official complaint channels\n\n🛡️ Step 3: Resist\n• Use legal methods of struggle\n• Unite with like-minded people\n• Apply civil resistance\n\n🤝 Step 4: Seek Help\n• Contact lawyers\n• Use international mechanisms\n• Seek support in social networks",
    },
    {
      icon: FaGavel,
      title: "Irreversibility of Harm and Responsibility",
      content:
        "Human rights violations have serious consequences that are often impossible to fully correct.\n\n💔 Irreversibility of harm:\n• Physical injuries can leave marks for life\n• Psychological trauma affects mental health\n• Social consequences can be long-term\n• Economic losses are often irreparable\n\n⚖️ Responsibility:\n• Everyone is responsible for their actions\n• Violators must be held accountable\n• Society must ensure justice\n\n🔐 Principle: «Violations cannot be undone — justice must prevail»\n• Striving for truth and restoration of justice\n• Preventing future violations\n• Creating a culture of respect for human rights",
    },
    {
      icon: FaBalanceScale,
      title: "International Protection Mechanisms",
      content:
        "How the global protection system works:\n\n🌍 UN:\n• Human Rights Council\n• Treaty bodies\n• Special procedures\n\n🇪🇺 European system:\n• European Court of Human Rights\n• Human Rights Commissioner\n• Human Rights Agency\n\n🔍 Regional systems:\n• African Commission\n• Inter-American Court\n• ASEAN Intergovernmental Commission",
    },
    {
      icon: FaHeart,
      title: "Social and Economic Rights",
      content:
        "Rights for dignified living:\n\n🏥 Right to health:\n• Medical care\n• Disease prevention\n• Access to medicines\n\n🎓 Right to education:\n• Free basic education\n• Accessibility of higher education\n• Quality of learning\n\n🏠 Right to housing:\n• Affordable housing\n• Protection from eviction\n• Decent living conditions\n\n🍞 Right to work:\n• Fair pay\n• Safe conditions\n• Social protection",
    },
    {
      icon: FaLock,
      title: "Protection from Violations",
      content:
        "How to protect your rights:\n\n📝 National mechanisms:\n• Constitutional courts\n• Ombudsmen\n• Judicial system\n• Human rights organizations\n\n🌐 International instruments:\n• Individual complaints\n• Universal Periodic Review\n• Special rapporteurs\n\n💪 Activism and civil society:\n• Public campaigns\n• Petitions and rallies\n• Media activism\n• Legal education",
    },
    {
      icon: FaEye,
      title: "Digital Rights and Privacy",
      content:
        "Human rights in the digital age:\n\n🔐 Right to digital privacy:\n• Protection of personal data\n• Control over information\n• Protection from mass surveillance\n\n🌐 Digital freedoms:\n• Internet access\n• Freedom of information online\n• Protection from censorship\n\n🤖 AI and human rights:\n• Algorithmic justice\n• Prevention of discrimination\n• Transparency of AI systems",
    },
    {
      icon: Shield,
      title: "Rights of Vulnerable Groups",
      content:
        "Special protection for vulnerable groups:\n\n👶 Children:\n• Right to development\n• Protection from exploitation\n• Education and care\n\n👵 Elderly people:\n• Dignified old age\n• Social security\n• Protection from abuse\n\n🚺 Women:\n• Equal rights\n• Protection from violence\n• Equal opportunities\n\n🌈 LGBTQ+ community:\n• Prohibition of discrimination\n• Right to family\n• Protection from persecution",
    },
  ];

  const testQuestions = [
    {
      question: "Which of the following rights are inalienable?",
      options: [
        "Only political rights",
        "Only social rights", 
        "All human rights",
        "Only economic rights"
      ],
      correct: 2,
    },
    {
      question: "Which of the following constitutes a human rights violation?",
      options: [
        "Payment for work",
        "Censorship in media",
        "Medical care",
        "Access to education"
      ],
      correct: 1,
    },
    {
      question: "How to properly document rights violations?",
      options: [
        "Only memorize events",
        "Record evidence, dates, witnesses",
        "Do not document at all",
        "Only take photos"
      ],
      correct: 1,
    },
    {
      question: "What does the 'Do No Harm' principle mean?",
      options: [
        "You can violate others' rights",
        "Respect for others' physical and psychological safety",
        "Only financial caution",
        "Doesn't matter"
      ],
      correct: 1,
    },
    {
      question: "What is the first step in protecting your rights?",
      options: [
        "Do nothing",
        "Document all violation facts",
        "Immediately go to court",
        "Spread on social media"
      ],
      correct: 1,
    },
    {
      question: "Why are rights violations considered irreversible?",
      options: [
        "They have no consequences",
        "Harm often cannot be fully corrected",
        "Violators always avoid responsibility",
        "Rights don't matter"
      ],
      correct: 1,
    },
    {
      question: "How to resist rights violations?",
      options: [
        "Use illegal methods",
        "Use legal methods of struggle",
        "Do nothing",
        "Agree with violations"
      ],
      correct: 1,
    },
    {
      question: "Who is responsible for human rights violations?",
      options: [
        "Nobody",
        "Only the state",
        "Everyone for their actions",
        "Only international organizations"
      ],
      correct: 2,
    },
    {
      question: "What is discrimination?",
      options: [
        "Equal treatment for all",
        "Inequality based on gender, race, religion",
        "Fair conditions for everyone",
        "Respect for others' rights"
      ],
      correct: 1,
    },
    {
      question: "What is the main principle in human rights?",
      options: [
        "Violations cannot be undone — justice must prevail",
        "Rights can be ignored",
        "Only the strong have rights",
        "Rights don't matter"
      ],
      correct: 0,
    },
  ];

  const handleAgreementChange = () => {
    setAgreements((prev) => ({
      all: !prev.all,
    }));
  };

  const handleAnswer = (questionIndex, answerIndex) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
  };

  const calculateResult = () => {
    const correctAnswers = testAnswers.reduce((acc, answer, index) => {
      return acc + (answer === testQuestions[index].correct ? 1 : 0);
    }, 0);

    return correctAnswers === testQuestions.length;
  };

  const handleTestSubmit = () => {
    const passed = calculateResult();
    setTestCompleted(true);

    if (passed) {
      setTimeout(() => {
        navigate("/feed");
      }, 3000);
    }
  };

  const canStartLearning = linkClicked && agreements.all;

  if (testCompleted) {
    const passed = calculateResult();
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gray-50 py-8"
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white/95 rounded-2xl shadow-lg p-8 text-center border border-blue-100 backdrop-blur-sm">
            {passed ? (
              <>
                <div className="mb-6">
                  <Check className="text-green-500 w-16 h-16 mx-auto" />
                </div>
                <h2 className="text-3xl font-bold text-green-600 mb-6">
                  Congratulations on Your Success!
                </h2>
                <p className="text-lg text-gray-700 mb-6">
                  You have successfully passed all challenges! You will now be redirected to the main DAO page...
                </p>
                <div className="animate-pulse text-blue-500">
                  <div className="flex justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-red-600 mb-6">
                  Needs a Bit More Practice
                </h2>
                <p className="text-lg text-gray-700 mb-6">
                  But don't be discouraged! Every attempt makes you a stronger human rights defender.
                </p>
                <button
                  onClick={() => {
                    setTestCompleted(false);
                    setTestAnswers([]);
                    setCurrentStep(0);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-4 rounded-full hover:from-blue-700 hover:to-blue-600 transition-all transform hover:scale-105 text-lg font-bold shadow-md"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 py-8"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Progress Bar */}
        {currentStep > 0 && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Onboarding Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="bg-white/95 rounded-2xl shadow-lg p-8 border border-blue-100 backdrop-blur-sm">
          {/* Welcome Section */}
          {currentStep === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="mb-6">
                <Shield className="text-blue-600 w-20 h-20 mx-auto" />
              </div>
              <h1 className="text-4xl font-bold text-blue-950 mb-6">
                {welcomeMessage.title}
              </h1>
              <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
                {welcomeMessage.text}
              </p>

              {/* Policy Link Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 text-left max-w-2xl mx-auto shadow-sm">
                <div className="flex items-start">
                  <Book className="text-blue-600 w-6 h-6 mt-1 mr-4 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-blue-950 text-lg mb-2">
                      Mandatory Task:
                    </p>
                    <p className="text-gray-700 mb-4">
                      Carefully review the document{" "}
                      <a
                        href="https://ipfs.io/ipfs/QmRXQP1s6rVaiXxrr6jY6Y7EfK1CYvyc82F99siunckoQr/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-bold hover:text-blue-600 transition-colors inline-flex items-center"
                        onClick={() => setLinkClicked(true)}
                      >
                        Human Rights Policy <Link className="ml-1 w-4 h-4" />
                      </a>{" "}
                      before continuing!
                    </p>
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Check
                        className={
                          linkClicked ? "text-green-500 w-4 h-4" : "text-gray-300 w-4 h-4"
                        }
                      />
                      <span
                        className={
                          linkClicked
                            ? "text-green-600 font-semibold text-sm"
                            : "text-gray-500 text-sm"
                        }
                      >
                        {linkClicked
                          ? "Document reviewed"
                          : "Not yet reviewed"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agreements */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 max-w-2xl mx-auto shadow-sm">
                <h3 className="text-lg font-semibold text-blue-950 mb-4">
                  Required Agreements:
                </h3>
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <div
                    className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      agreements.all
                        ? "bg-green-500 border-green-500"
                        : "border-gray-300 group-hover:border-blue-400"
                    }`}
                  >
                    {agreements.all && (
                      <Check className="text-white w-3 h-3" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={agreements.all}
                    onChange={handleAgreementChange}
                    className="hidden"
                  />
                  <span className="text-gray-700 group-hover:text-gray-900 text-sm">
                    I accept the terms of the <strong>Human Rights Policy</strong>,{" "}
                    <strong>Privacy Policy</strong> and{" "}
                    <strong>Terms of Use</strong> of the DAO platform. 
                    I commit to adhering to human rights principles, 
                    community rules and agree to the processing of personal data.
                  </span>
                </label>
              </div>

              <button
                onClick={() => setCurrentStep(1)}
                disabled={!canStartLearning}
                className={`px-12 py-4 rounded-full text-lg font-bold transition-all transform ${
                  canStartLearning
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 hover:scale-105 shadow-md"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {canStartLearning ? (
                  <span className="flex items-center">
                    Start Learning <ArrowRight className="ml-2 w-5 h-5" />
                  </span>
                ) : (
                  "Complete requirements to start"
                )}
              </button>
            </motion.div>
          )}

          {/* Education Content */}
          {currentStep > 0 && currentStep <= educationContent.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl">
                  {React.createElement(educationContent[currentStep - 1].icon, {
                    className: "text-white w-6 h-6",
                  })}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-950">
                    {educationContent[currentStep - 1].title}
                  </h1>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                    <span>
                      Step {currentStep} of {educationContent.length}
                    </span>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <span>Educational Module</span>
                  </div>
                </div>
              </div>

              <div className="prose max-w-none mb-8">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                    {educationContent[currentStep - 1].content}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-8">
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 1}
                  className={`flex items-center px-6 py-3 rounded-full transition-all ${
                    currentStep === 1
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gray-500 text-white hover:bg-gray-600 transform hover:scale-105"
                  }`}
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back
                </button>

                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex items-center bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-3 rounded-full hover:from-blue-700 hover:to-blue-600 transform hover:scale-105 transition-all font-semibold"
                >
                  {currentStep === educationContent.length
                    ? "Go to Test"
                    : "Next Lesson"}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Test Section */}
          {currentStep > educationContent.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-gradient-to-r from-green-600 to-green-500 rounded-2xl">
                  <Shield className="text-white w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-950">
                    Final Test: Knowledge Check
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Answer carefully - you need to answer all questions correctly to succeed!
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {testQuestions.map((question, questionIndex) => (
                  <div
                    key={questionIndex}
                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-200 transition-all"
                  >
                    <h3 className="text-lg font-semibold text-blue-950 mb-4 flex items-start">
                      <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3 flex-shrink-0">
                        {questionIndex + 1}
                      </span>
                      {question.question}
                    </h3>
                    <div className="grid gap-3 ml-11">
                      {question.options.map((option, optionIndex) => (
                        <label
                          key={optionIndex}
                          className={`flex items-center space-x-4 p-4 rounded-xl cursor-pointer transition-all ${
                            testAnswers[questionIndex] === optionIndex
                              ? "bg-blue-50 border-2 border-blue-300"
                              : "bg-white border-2 border-gray-200 hover:border-blue-200"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              testAnswers[questionIndex] === optionIndex
                                ? "border-blue-600 bg-blue-600"
                                : "border-gray-400"
                            }`}
                          >
                            {testAnswers[questionIndex] === optionIndex && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <input
                            type="radio"
                            name={`question-${questionIndex}`}
                            value={optionIndex}
                            checked={testAnswers[questionIndex] === optionIndex}
                            onChange={() =>
                              handleAnswer(questionIndex, optionIndex)
                            }
                            className="hidden"
                          />
                          <span className="text-gray-700 flex-1">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <button
                  onClick={handleTestSubmit}
                  disabled={testAnswers.length !== testQuestions.length}
                  className={`px-12 py-4 rounded-full text-lg font-bold transition-all transform ${
                    testAnswers.length === testQuestions.length
                      ? "bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 hover:scale-105 shadow-md"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Complete Test and Get Results
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  {testAnswers.length}/{testQuestions.length} questions answered
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default Onboarding;