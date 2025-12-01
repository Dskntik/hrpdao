// Courses.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaBook, FaClock, FaLock, FaCheck, FaArrowRight, FaArrowLeft } from "react-icons/fa";
import { supabase } from '../utils/supabase';

// Human rights courses database
const coursesDatabase = {
  day1: {
    title: "Basic Principles of Human Rights",
    description: "Exploring fundamental principles and history of human rights",
    questions: [
      {
        id: 1,
        question: "What is the Universal Declaration of Human Rights?",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Universal Declaration of Human Rights (UDHR)</h3>
            <p class="text-gray-700">
              The Universal Declaration of Human Rights is a foundational document adopted by the UN General Assembly on December 10, 1948. 
              It establishes fundamental rights and freedoms that all people should have without exception.
            </p>
            <div class="bg-blue-50 p-4 rounded-lg">
              <h4 class="font-semibold text-blue-800 mb-2">Key aspects:</h4>
              <ul class="list-disc list-inside space-y-1 text-blue-700">
                <li>First international document defining basic human rights</li>
                <li>Consists of 30 articles</li>
                <li>Has moral and political weight, though not legally binding</li>
                <li>Became the foundation for international human rights law</li>
              </ul>
            </div>
          </div>
        `
      },
      {
        id: 2,
        question: "What are the basic principles of human rights?",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Basic Principles of Human Rights</h3>
            <p class="text-gray-700">
              Human rights are based on several fundamental principles that make them universal and inalienable.
            </p>
            <div class="grid md:grid-cols-2 gap-4">
              <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-semibold text-green-800 mb-2">Universality</h4>
                <p class="text-green-700">Rights belong to every person regardless of race, gender, nationality, religion or any other status.</p>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg">
                <h4 class="font-semibold text-purple-800 mb-2">Inalienability</h4>
                <p class="text-purple-700">Rights cannot be taken away - they are inherent to every human being from birth.</p>
              </div>
              <div class="bg-orange-50 p-4 rounded-lg">
                <h4 class="font-semibold text-orange-800 mb-2">Indivisibility</h4>
                <p class="text-orange-700">All rights are equally important and interconnected, you cannot choose only some of them.</p>
              </div>
              <div class="bg-red-50 p-4 rounded-lg">
                <h4 class="font-semibold text-red-800 mb-2">Interdependence</h4>
                <p class="text-red-700">The realization of one right often depends on the realization of other rights.</p>
              </div>
            </div>
          </div>
        `
      },
      {
        id: 3,
        question: "History of human rights development",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Historical Development of Human Rights</h3>
            <div class="bg-yellow-50 p-4 rounded-lg">
              <h4 class="font-semibold text-yellow-800 mb-3">Key historical moments:</h4>
              <div class="space-y-3">
                <div class="border-l-4 border-yellow-500 pl-4">
                  <strong class="text-yellow-700">1215 - Magna Carta</strong>
                  <p class="text-yellow-600 text-sm">First document that limited monarch's power and established legal guarantees.</p>
                </div>
                <div class="border-l-4 border-blue-500 pl-4">
                  <strong class="text-blue-700">1789 - Declaration of the Rights of Man and of the Citizen</strong>
                  <p class="text-blue-600 text-sm">French Revolution brought new understanding of citizens' rights.</p>
                </div>
                <div class="border-l-4 border-green-500 pl-4">
                  <strong class="text-green-700">1948 - Universal Declaration of Human Rights</strong>
                  <p class="text-green-600 text-sm">Response to the horrors of World War II.</p>
                </div>
                <div class="border-l-4 border-purple-500 pl-4">
                  <strong class="text-purple-700">1966 - International Human Rights Covenants</strong>
                  <p class="text-purple-600 text-sm">Two covenants that gave the declaration legal force.</p>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: 4,
        question: "Groups of human rights",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Main Groups of Human Rights</h3>
            <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
              <div class="grid gap-4">
                <div class="bg-white p-4 rounded-lg shadow-sm">
                  <h4 class="font-semibold text-blue-800 mb-2">👥 Civil and Political Rights</h4>
                  <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Right to life</li>
                    <li>Freedom of speech and expression</li>
                    <li>Freedom of religion</li>
                    <li>Right to fair trial</li>
                  </ul>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm">
                  <h4 class="font-semibold text-green-800 mb-2">🏛️ Economic, Social and Cultural Rights</h4>
                  <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Right to work</li>
                    <li>Right to education</li>
                    <li>Right to healthcare</li>
                    <li>Right to social security</li>
                  </ul>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm">
                  <h4 class="font-semibold text-orange-800 mb-2">🌍 Third Generation Rights</h4>
                  <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Right to peace</li>
                    <li>Right to healthy environment</li>
                    <li>Right to development</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: 5,
        question: "International protection mechanisms",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">International Human Rights Protection Mechanisms</h3>
            <p class="text-gray-700">
              To ensure compliance with human rights, there is a system of international organizations and mechanisms.
            </p>
            <div class="bg-red-50 p-4 rounded-lg">
              <h4 class="font-semibold text-red-800 mb-3">Key organizations:</h4>
              <div class="space-y-3">
                <div>
                  <strong class="text-red-700">United Nations (UN)</strong>
                  <p class="text-red-600 text-sm">Main international organization dealing with human rights through Human Rights Council, High Commissioner, etc.</p>
                </div>
                <div>
                  <strong class="text-red-700">European Court of Human Rights (ECtHR)</strong>
                  <p class="text-red-600 text-sm">Court that considers complaints about violations of rights guaranteed by the European Convention.</p>
                </div>
                <div>
                  <strong class="text-red-700">International Criminal Court (ICC)</strong>
                  <p class="text-red-600 text-sm">Considers the most serious crimes against humanity, genocide, war crimes.</p>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: 6,
        question: "Children's rights",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Special Rights of the Child</h3>
            <p class="text-gray-700">
              Children have special rights due to their vulnerability and need for protection. The Convention on the Rights of the Child (1989) defines these rights.
            </p>
            <div class="bg-pink-50 p-4 rounded-lg">
              <h4 class="font-semibold text-pink-800 mb-3">Basic principles of children's rights:</h4>
              <div class="grid gap-3">
                <div class="flex items-start space-x-3">
                  <div class="bg-pink-100 p-2 rounded-full">
                    <span class="text-pink-600 font-bold">1</span>
                  </div>
                  <div>
                    <strong class="text-pink-700">Inviolability</strong>
                    <p class="text-pink-600 text-sm">Right to life, survival and development</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="bg-pink-100 p-2 rounded-full">
                    <span class="text-pink-600 font-bold">2</span>
                  </div>
                  <div>
                    <strong class="text-pink-700">Protection</strong>
                    <p class="text-pink-600 text-sm">From all forms of violence, exploitation and abuse</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="bg-pink-100 p-2 rounded-full">
                    <span class="text-pink-600 font-bold">3</span>
                  </div>
                  <div>
                    <strong class="text-pink-700">Participation</strong>
                    <p class="text-pink-600 text-sm">Right to express opinion and participate in decision-making</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="bg-pink-100 p-2 rounded-full">
                    <span class="text-pink-600 font-bold">4</span>
                  </div>
                  <div>
                    <strong class="text-pink-700">Non-discrimination</strong>
                    <p class="text-pink-600 text-sm">All rights apply to every child without exception</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: 7,
        question: "Fighting discrimination",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Fighting Discrimination and Equality</h3>
            <p class="text-gray-700">
              Prohibition of discrimination is a basic principle of human rights. Everyone has the right to equal treatment regardless of personal characteristics.
            </p>
            <div class="bg-indigo-50 p-4 rounded-lg">
              <h4 class="font-semibold text-indigo-800 mb-3">Types of discrimination:</h4>
              <div class="space-y-2">
                <div class="flex justify-between items-center p-2 bg-white rounded">
                  <span class="text-indigo-700">Race and ethnic origin</span>
                  <span class="text-red-500 text-sm">Prohibited</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-white rounded">
                  <span class="text-indigo-700">Gender</span>
                  <span class="text-red-500 text-sm">Prohibited</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-white rounded">
                  <span class="text-indigo-700">Religion</span>
                  <span class="text-red-500 text-sm">Prohibited</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-white rounded">
                  <span class="text-indigo-700">Disability</span>
                  <span class="text-red-500 text-sm">Prohibited</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-white rounded">
                  <span class="text-indigo-700">Age</span>
                  <span class="text-red-500 text-sm">Prohibited</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-white rounded">
                  <span class="text-indigo-700">Sexual orientation</span>
                  <span class="text-red-500 text-sm">Prohibited</span>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: 8,
        question: "Women's rights",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Women's Rights and Gender Equality</h3>
            <p class="text-gray-700">
              The struggle for women's rights is an important part of the general human rights movement. Women often face unique challenges and forms of discrimination.
            </p>
            <div class="bg-purple-50 p-4 rounded-lg">
              <h4 class="font-semibold text-purple-800 mb-3">Key aspects of women's rights:</h4>
              <div class="space-y-3">
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-purple-700">Political participation</strong>
                  <p class="text-purple-600 text-sm">Right to participate in political life and decision-making</p>
                </div>
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-purple-700">Economic rights</strong>
                  <p class="text-purple-600 text-sm">Equal pay, access to credit and property</p>
                </div>
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-purple-700">Education</strong>
                  <p class="text-purple-600 text-sm">Equal access to education at all levels</p>
                </div>
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-purple-700">Health</strong>
                  <p class="text-purple-600 text-sm">Access to medical services, including reproductive health</p>
                </div>
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-purple-700">Protection from violence</strong>
                  <p class="text-purple-600 text-sm">Fighting domestic violence and sexual harassment</p>
                </div>
              </div>
            </div>
          </div>
        `
      },
      {
        id: 9,
        question: "Freedom of expression",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Freedom of Expression and Information</h3>
            <p class="text-gray-700">
              Freedom of expression is a fundamental right that allows people to freely express their thoughts and ideas.
            </p>
            <div class="bg-blue-50 p-4 rounded-lg">
              <h4 class="font-semibold text-blue-800 mb-3">Aspects of freedom of expression:</h4>
              <div class="space-y-3">
                <div class="border-l-4 border-blue-500 pl-4">
                  <strong class="text-blue-700">Freedom of speech</strong>
                  <p class="text-blue-600 text-sm">Right to freely express opinions without censorship</p>
                </div>
                <div class="border-l-4 border-green-500 pl-4">
                  <strong class="text-green-700">Freedom of the press</strong>
                  <p class="text-green-600 text-sm">Right of media to freely gather and disseminate information</p>
                </div>
                <div class="border-l-4 border-purple-500 pl-4">
                  <strong class="text-purple-700">Academic freedom</strong>
                  <p class="text-purple-600 text-sm">Freedom of research and teaching</p>
                </div>
                <div class="border-l-4 border-orange-500 pl-4">
                  <strong class="text-orange-700">Artistic freedom</strong>
                  <p class="text-orange-600 text-sm">Freedom of creativity and artistic expression</p>
                </div>
              </div>
              <div class="mt-4 p-3 bg-yellow-50 rounded-lg">
                <strong class="text-yellow-700">Limitations:</strong>
                <p class="text-yellow-600 text-sm">Freedom of expression may be limited to protect others' reputation, national security or public order.</p>
              </div>
            </div>
          </div>
        `
      },
      {
        id: 10,
        question: "Right to education",
        content: `
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-blue-900">Right to Education</h3>
            <p class="text-gray-700">
              The right to education is a fundamental right that ensures personal development and participation in social life.
            </p>
            <div class="bg-green-50 p-4 rounded-lg">
              <h4 class="font-semibold text-green-800 mb-3">Characteristics of the right to education:</h4>
              <div class="grid md:grid-cols-2 gap-4">
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-green-700">🆓 Availability</strong>
                  <p class="text-green-600 text-sm">Education must be free and accessible to all</p>
                </div>
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-green-700">🎯 Acceptability</strong>
                  <p class="text-green-600 text-sm">Education content must be quality and relevant</p>
                </div>
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-green-700">🌍 Adaptability</strong>
                  <p class="text-green-600 text-sm">Education must adapt to changing societal needs</p>
                </div>
                <div class="bg-white p-3 rounded-lg">
                  <strong class="text-green-700">⚖️ Equality</strong>
                  <p class="text-green-600 text-sm">Equal opportunities for all without discrimination</p>
                </div>
              </div>
              <div class="mt-4 bg-white p-3 rounded-lg">
                <strong class="text-green-700">Education levels:</strong>
                <ul class="list-disc list-inside text-green-600 text-sm space-y-1 mt-2">
                  <li>Primary education - compulsory and free</li>
                  <li>Secondary education - available and accessible</li>
                  <li>Higher education - equal access based on abilities</li>
                  <li>Lifelong education - opportunity to learn continuously</li>
                </ul>
              </div>
            </div>
          </div>
        `
      }
    ]
  },
  day2: {
    title: "International Human Rights Law",
    description: "Study of international documents and protection mechanisms",
    questions: [
      // Similar structure for day 2...
    ]
  }
  // Can add additional days...
};

function Courses({ currentUser }) {
  const [currentCourse, setCurrentCourse] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15); // Changed to 15 seconds
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [canTakeCourse, setCanTakeCourse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check course availability
  const checkCourseAvailability = async () => {
  if (!currentUser?.id) {
    setLoading(false);
    return;
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const { data: todayCourses, error } = await supabase
      .from('user_courses')
      .select('completed_at, course_day')
      .eq('user_id', currentUser.id)
      .gte('completed_at', startOfDay.toISOString())
      .lt('completed_at', endOfDay.toISOString())
      .order('completed_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking course availability:', error);
      setCanTakeCourse(true);
    } else if (todayCourses && todayCourses.length > 0) {
      setCanTakeCourse(false);
    } else {
      setCanTakeCourse(true);
      // Generate course for current day
      const courseDay = 1; // Can add logic for sequential days
      setCurrentCourse({
        ...coursesDatabase[`day${courseDay}`],
        day: courseDay
      });
    }
  } catch (error) {
    console.error('Error in checkCourseAvailability:', error);
    setCanTakeCourse(true);
  } finally {
    setLoading(false);
  }
};

  // Timer for each question
  useEffect(() => {
    if (currentCourse && !courseCompleted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentCourse, courseCompleted, timeLeft]);

  // Go to next question
  const goToNextQuestion = () => {
    if (timeLeft > 0) return; // Prevent transition before time ends
    
    if (currentQuestion < currentCourse.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setTimeLeft(15); // Changed to 15 seconds
    } else {
      completeCourse();
    }
  };

  // Go to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setTimeLeft(15); // Changed to 15 seconds
    }
  };

  // Complete course
const completeCourse = async () => {
  if (!currentUser?.id) return;

  try {
    setSubmitting(true);
    
    // Additional check before completion
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const { data: existingCourses, error: checkError } = await supabase
      .from('user_courses')
      .select('id')
      .eq('user_id', currentUser.id)
      .gte('completed_at', startOfDay.toISOString())
      .lt('completed_at', endOfDay.toISOString())
      .limit(1);

    if (checkError) throw checkError;
    
    if (existingCourses && existingCourses.length > 0) {
      alert('You have already completed the course today!');
      setCanTakeCourse(false);
      return;
    }

    // Save course result
    const courseRecord = {
      user_id: currentUser.id,
      course_day: currentCourse.day,
      completed_at: new Date().toISOString(),
      questions_studied: currentCourse.questions.length,
      time_spent: currentCourse.questions.length * 15 // Changed to 15 seconds per question
    };

    const { data: courseData, error: courseError } = await supabase
      .from('user_courses')
      .insert([courseRecord])
      .select();

    if (courseError) throw courseError;

    setCourseCompleted(true);
    setCanTakeCourse(false);

  } catch (error) {
    console.error('Error completing course:', error);
    alert('Error completing course. Please try again.');
  } finally {
    setSubmitting(false);
  }
};

  // Start course
  const startCourse = () => {
    setCurrentQuestion(0);
    setTimeLeft(15); // Changed to 15 seconds
    setCourseCompleted(false);
  };

  useEffect(() => {
    checkCourseAvailability();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading courses...</p>
      </div>
    );
  }

  if (!canTakeCourse) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center"
      >
        <FaLock className="text-4xl text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">Course Already Completed Today</h3>
        <p className="text-gray-600 mb-4">
          You have already completed today's course. Return tomorrow for new learning material!
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-700">
            Daily courses will help you deepen your knowledge of human rights
          </p>
        </div>
      </motion.div>
    );
  }

  if (courseCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center"
      >
        <div className="text-green-500 text-6xl mb-4">
          <FaCheck />
        </div>
        <h3 className="text-2xl font-bold text-green-600 mb-4">
          Course Successfully Completed!
        </h3>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-2xl mb-4 max-w-md mx-auto">
          <div className="text-3xl font-bold mb-2">Congratulations!</div>
          <div className="text-lg">
            You completed the "{currentCourse?.title}" course
          </div>
        </div>
        <p className="text-gray-600 mb-6">
          Congratulations! You have successfully completed the course material. 
          Return tomorrow for a new course!
        </p>
      </motion.div>
    );
  }

  if (!currentCourse) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center"
      >
        <FaBook className="text-4xl text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-blue-950 mb-2">Interactive Courses</h3>
        <p className="text-gray-600 mb-4">Comprehensive human rights courses</p>
        <button
          onClick={startCourse}
          className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-3 rounded-full hover:from-blue-700 hover:to-blue-600 transition-all transform hover:scale-105 font-semibold"
        >
          Start Course
        </button>
      </motion.div>
    );
  }

  const currentQ = currentCourse.questions[currentQuestion];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100"
    >
      {/* Course title */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-blue-950">
              {currentCourse.title} - Day {currentCourse.day}
            </h2>
            <p className="text-gray-600">
              Question {currentQuestion + 1} of {currentCourse.questions.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className={`px-3 py-2 rounded-full font-semibold flex items-center ${timeLeft > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <FaClock className="inline mr-2" />
              {timeLeft} sec
            </div>
            <div className="bg-blue-100 px-3 py-2 rounded-full text-blue-700 font-semibold flex items-center">
              <FaBook className="inline mr-2" />
              Learning
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / currentCourse.questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Current question */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-blue-950 mb-4 flex items-start">
          <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3 flex-shrink-0">
            {currentQuestion + 1}
          </span>
          {currentQ.question}
        </h3>
        
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: currentQ.content }}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={goToPreviousQuestion}
          disabled={currentQuestion === 0}
          className={`flex items-center px-4 py-2 rounded-lg transition-all ${
            currentQuestion === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-blue-600 hover:bg-blue-50'
          }`}
        >
          <FaArrowLeft className="mr-2" />
          Previous
        </button>

        <div className="text-sm text-gray-500 text-center">
          {timeLeft > 0 ? (
            <span>Access to next question in {timeLeft} sec</span>
          ) : (
            <span className="text-green-600">Can proceed to next question</span>
          )}
        </div>

        <button
          onClick={goToNextQuestion}
          disabled={timeLeft > 0 || submitting}
          className={`flex items-center px-4 py-2 rounded-lg transition-all ${
            timeLeft > 0 || submitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {currentQuestion === currentCourse.questions.length - 1 ? 'Complete Course' : 'Next'}
          <FaArrowRight className="ml-2" />
        </button>
      </div>
    </motion.div>
  );
}

export default Courses;