import logging
from datetime import date, datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.database.mongodb import get_database
from app.rag.document_processor import get_qdrant_client, get_embeddings
from langchain_community.vectorstores import Qdrant
from bson import ObjectId

logger = logging.getLogger("studypilot.rag.generators")

# --- Pydantic Models for Structured Output ---

class DailyTask(BaseModel):
    title: str = Field(description="The specific task to complete")
    hours: float = Field(description="Estimated hours to complete")
    subject: str = Field(description="The related subject for this task")

class DailyPlan(BaseModel):
    date_str: str = Field(description="The date in YYYY-MM-DD format")
    tasks: List[DailyTask] = Field(description="Tasks for this specific day")

class WeeklyMilestone(BaseModel):
    week_id: str = Field(description="The week identifier, e.g., week_1")
    milestone: str = Field(description="The major goal for this week")

class StudyPlanSchema(BaseModel):
    daily_plan: List[DailyPlan] = Field(description="List of daily plans from tomorrow up to the exam date")
    weekly_plan: List[WeeklyMilestone] = Field(description="List of weekly milestones")

class QuizQuestion(BaseModel):
    question_text: str = Field(description="The actual question")
    type: str = Field(description="Question type: 'MCQ', 'TF' (True/False), or 'Short' (Short Answer)")
    options: Optional[List[str]] = Field(default=None, description="List of options if MCQ or TF")
    correct_answer: str = Field(description="The correct answer text")
    explanation: str = Field(description="Brief explanation of why the answer is correct")

class QuizSchema(BaseModel):
    questions: List[QuizQuestion]

# --- AI Generators ---

def generate_mock_study_plan(exam_date: date, daily_hours: float, subjects: List[str]) -> dict:
    daily_dict = {}
    weekly_dict = {}
    
    start_date = date.today()
    end_date = exam_date
    delta = end_date - start_date
    total_days = max(0, delta.days)
    
    # Generate daily tasks
    for i in range(total_days + 1):
        current_day = start_date + timedelta(days=i)
        date_str = current_day.isoformat()
        
        # Pick a subject from the list to focus on
        subject = subjects[i % len(subjects)] if subjects else "General Study"
        
        daily_dict[date_str] = [
            {
                "id": f"task_{date_str}_0",
                "title": f"Review fundamental concepts of {subject}",
                "hours": round(daily_hours * 0.6, 1),
                "completed": False
            },
            {
                "id": f"task_{date_str}_1",
                "title": f"Solve practice exercises and quiz on {subject}",
                "hours": round(daily_hours * 0.4, 1),
                "completed": False
            }
        ]
        
    # Generate weekly milestones
    total_weeks = (total_days // 7) + 1
    for w in range(1, total_weeks + 1):
        week_id = f"week_{w}"
        milestone_sub = subjects[(w - 1) % len(subjects)] if subjects else "Core Topics"
        weekly_dict[week_id] = {
            "milestone": f"Complete intensive review and practice tests for {milestone_sub}",
            "completed": False
        }
        
    return {
        "daily_plan": daily_dict,
        "weekly_plan": weekly_dict
    }

def generate_mock_questions(topic: str, quiz_type: str, num_questions: int) -> list:
    questions = []
    display_topic = topic.strip() if topic else "General Study"
    topic_lower = display_topic.lower()

    # Predefined topic-specific question banks to make mock mode feel intelligent
    vegetable_questions = [
        {
            "question_text": "Which of the following is a root vegetable?",
            "type": "MCQ",
            "options": ["Carrot", "Lettuce", "Tomato", "Apple"],
            "correct_answer": "Carrot",
            "explanation": "Carrots grow underground and are classified as root vegetables."
        },
        {
            "question_text": "True or False: Vegetables are generally rich in essential vitamins, minerals, and dietary fiber.",
            "type": "TF",
            "options": ["True", "False"],
            "correct_answer": "True",
            "explanation": "Vegetables are key sources of nutrients, including potassium, dietary fiber, folate, vitamin A, and vitamin C."
        },
        {
            "question_text": "Which vitamin is particularly abundant in leafy green vegetables like spinach?",
            "type": "MCQ",
            "options": ["Vitamin K", "Vitamin B12", "Vitamin D3", "Vitamin E"],
            "correct_answer": "Vitamin K",
            "explanation": "Leafy green vegetables are excellent sources of Vitamin K, which is essential for blood clotting and bone health."
        },
        {
            "question_text": "What is the process by which green plants (including many vegetables) convert light into energy?",
            "type": "MCQ",
            "options": ["Photosynthesis", "Respiration", "Fermentation", "Transpiration"],
            "correct_answer": "Photosynthesis",
            "explanation": "Photosynthesis is the process used by plants to convert light energy into chemical energy."
        },
        {
            "question_text": "Which of the following is technically a fruit but commonly culinary-classified as a vegetable?",
            "type": "MCQ",
            "options": ["Tomato", "Potato", "Cabbage", "Onion"],
            "correct_answer": "Tomato",
            "explanation": "Botanically, tomatoes are fruits because they form from a flower and contain seeds, but they are used as vegetables in culinary contexts."
        }
    ]

    computer_networks_questions = [
        {
            "question_text": "Which protocol is responsible for resolving domain names into IP addresses?",
            "type": "MCQ",
            "options": ["DNS", "HTTP", "FTP", "SMTP"],
            "correct_answer": "DNS",
            "explanation": "The Domain Name System (DNS) translates human-readable hostnames into machine-readable IP addresses."
        },
        {
            "question_text": "True or False: IPv6 addresses are 128-bit long, compared to the 32-bit length of IPv4 addresses.",
            "type": "TF",
            "options": ["True", "False"],
            "correct_answer": "True",
            "explanation": "IPv6 uses 128-bit addresses to provide a much larger address space than IPv4."
        },
        {
            "question_text": "Which layer of the OSI model is responsible for routing packets across different networks?",
            "type": "MCQ",
            "options": ["Network Layer", "Transport Layer", "Physical Layer", "Application Layer"],
            "correct_answer": "Network Layer",
            "explanation": "The Network Layer (Layer 3) handles packet routing, forwarding, and addressing."
        },
        {
            "question_text": "What is the main function of a router in a computer network?",
            "type": "MCQ",
            "options": ["To forward data packets between computer networks", "To display webpages to users", "To store databases locally", "To execute compiled programs"],
            "correct_answer": "To forward data packets between computer networks",
            "explanation": "Routers direct traffic on the internet and local networks by forwarding packets to their destination IP addresses."
        },
        {
            "question_text": "Which transport protocol guarantees delivery of packets and maintains their order?",
            "type": "MCQ",
            "options": ["TCP", "UDP", "ICMP", "ARP"],
            "correct_answer": "TCP",
            "explanation": "TCP (Transmission Control Protocol) is connection-oriented and ensures reliable, ordered delivery of data."
        }
    ]

    science_questions = [
        {
            "question_text": "What is the basic unit of a chemical element?",
            "type": "MCQ",
            "options": ["Atom", "Molecule", "Electron", "Proton"],
            "correct_answer": "Atom",
            "explanation": "An atom is the smallest unit of matter that retains all of the chemical properties of an element."
        },
        {
            "question_text": "True or False: Light travels faster in a vacuum than sound does in any medium.",
            "type": "TF",
            "options": ["True", "False"],
            "correct_answer": "True",
            "explanation": "The speed of light in a vacuum is approximately 299,792 km/s, which is vastly faster than the speed of sound."
        },
        {
            "question_text": "Which organelle is known as the powerhouse of the cell?",
            "type": "MCQ",
            "options": ["Mitochondria", "Nucleus", "Ribosome", "Golgi Apparatus"],
            "correct_answer": "Mitochondria",
            "explanation": "Mitochondria generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy."
        },
        {
            "question_text": "What force keeps the planets in orbit around the Sun?",
            "type": "MCQ",
            "options": ["Gravity", "Electromagnetism", "Strong Nuclear Force", "Centrifugal Force"],
            "correct_answer": "Gravity",
            "explanation": "Gravity is the attractive force that acts between any two masses, holding planets in their orbits."
        },
        {
            "question_text": "Which element is the most abundant in Earth's atmosphere?",
            "type": "MCQ",
            "options": ["Nitrogen", "Oxygen", "Carbon Dioxide", "Argon"],
            "correct_answer": "Nitrogen",
            "explanation": "Nitrogen makes up about 78% of Earth's atmosphere."
        }
    ]

    math_questions = [
        {
            "question_text": "What is the value of Pi (to two decimal places)?",
            "type": "MCQ",
            "options": ["3.14", "3.16", "3.12", "3.18"],
            "correct_answer": "3.14",
            "explanation": "Pi is the ratio of a circle's circumference to its diameter, approximately 3.14159..."
        },
        {
            "question_text": "True or False: A prime number is a whole number greater than 1 whose only divisors are 1 and itself.",
            "type": "TF",
            "options": ["True", "False"],
            "correct_answer": "True",
            "explanation": "Prime numbers like 2, 3, 5, 7, etc. have no other divisors."
        },
        {
            "question_text": "What is the square root of 144?",
            "type": "MCQ",
            "options": ["12", "14", "10", "16"],
            "correct_answer": "12",
            "explanation": "12 multiplied by 12 equals 144."
        },
        {
            "question_text": "Which theorem states that in a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides?",
            "type": "MCQ",
            "options": ["Pythagorean Theorem", "Fermat's Last Theorem", "Euler's Theorem", "Fundamental Theorem of Algebra"],
            "correct_answer": "Pythagorean Theorem",
            "explanation": "a^2 + b^2 = c^2 is the classic formula of the Pythagorean Theorem."
        },
        {
            "question_text": "What is the sum of angles in a triangle?",
            "type": "MCQ",
            "options": ["180 degrees", "90 degrees", "360 degrees", "270 degrees"],
            "correct_answer": "180 degrees",
            "explanation": "The interior angles of any triangle always add up to 180 degrees."
        }
    ]

    # Select bank based on keywords
    bank = []
    if any(keyword in topic_lower for keyword in ["vegetable", "veg", "food", "plant", "garden", "bio", "agriculture"]):
        bank = vegetable_questions
    elif any(keyword in topic_lower for keyword in ["network", "internet", "protocol", "ip", "dns", "routing", "tcp", "udp"]):
        bank = computer_networks_questions
    elif any(keyword in topic_lower for keyword in ["science", "physics", "chemistry", "biology", "space", "atom"]):
        bank = science_questions
    elif any(keyword in topic_lower for keyword in ["math", "mathematics", "algebra", "geometry", "calculus", "number"]):
        bank = math_questions

    # Generate the question objects
    for i in range(num_questions):
        q_idx = i + 1
        
        # Determine the target type for this question index
        target_type = quiz_type
        if quiz_type == "Mixed":
            target_type = "MCQ" if q_idx % 2 == 1 else "TF"

        # Check if we can pull from our predefined bank
        matched_q = None
        if bank:
            # Try to find a matching question from the bank that fits the target type
            candidates = [q for q in bank if q["type"] == target_type]
            if not candidates:
                candidates = bank
            matched_q = candidates[i % len(candidates)]

        if matched_q and (quiz_type in ["MCQ", "TF", "Mixed"] or (quiz_type == "Short" and matched_q["type"] == "Short")):
            # Use bank question
            questions.append({
                "id": q_idx,
                "question_text": matched_q["question_text"],
                "type": matched_q["type"],
                "options": matched_q["options"],
                "correct_answer": matched_q["correct_answer"],
                "explanation": matched_q["explanation"]
            })
        else:
            # Fallback to general, customized dynamic templates (5 unique ones)
            if target_type == "MCQ":
                templates = [
                    {
                        "question_text": f"Which of the following represents a primary definition or core concept of {display_topic}?",
                        "options": [
                            f"The systematic study, analysis, or application of {display_topic} principles",
                            f"A minor historical footnote that has been completely abandoned in modern practice",
                            "A process purely concerned with unrelated aesthetic details",
                            "None of the above"
                        ],
                        "correct_answer": f"The systematic study, analysis, or application of {display_topic} principles",
                        "explanation": f"To understand {display_topic}, one must study its core systematic principles and practical application."
                    },
                    {
                        "question_text": f"Which of the following is typically a key objective when working with or studying {display_topic}?",
                        "options": [
                            f"To gain deeper insight and optimize outcomes related to {display_topic} processes",
                            "To obscure facts and make the topic as confusing as possible",
                            "To prove that the subject has absolutely no relevance or utility",
                            "To replace all logical reasoning with random guesses"
                        ],
                        "correct_answer": f"To gain deeper insight and optimize outcomes related to {display_topic} processes",
                        "explanation": f"Gaining structural and functional insights into {display_topic} helps in optimizing related processes and solutions."
                    },
                    {
                        "question_text": f"Which of the following is widely recognized as a major challenge or area of focus in {display_topic} today?",
                        "options": [
                            "Ensuring accuracy, efficiency, and proper integration of its core elements",
                            "Ensuring it is never applied to any real-world scenario",
                            "Restricting access so that no one can learn its basics",
                            "Maximizing errors and operational overhead"
                        ],
                        "correct_answer": "Ensuring accuracy, efficiency, and proper integration of its core elements",
                        "explanation": f"Modern systems/studies of {display_topic} focus heavily on enhancing the accuracy and integration efficiency of its components."
                    },
                    {
                        "question_text": f"What is a commonly recommended first step for beginners trying to master {display_topic}?",
                        "options": [
                            "Understanding the fundamental terminology and basic concepts",
                            "Memorizing advanced edge-cases without knowing the basics",
                            "Assuming the subject is entirely fictional",
                            "Skipping all study materials and attempting final exams directly"
                        ],
                        "correct_answer": "Understanding the fundamental terminology and basic concepts",
                        "explanation": f"A solid foundation in the basic concepts of {display_topic} is critical before advancing to more complex topics."
                    },
                    {
                        "question_text": f"In academic study, which methodology is most reliable for evaluating claims about {display_topic}?",
                        "options": [
                            "Empirical observation, research, and logical analysis",
                            "Relying solely on popular myths and hearsay",
                            "Assuming whatever sounds most complicated must be true",
                            "Accepting only outdated materials from a century ago"
                        ],
                        "correct_answer": "Empirical observation, research, and logical analysis",
                        "explanation": f"Rigorous study of {display_topic} relies on evidence-based observation and logical reasoning."
                    }
                ]
                tpl = templates[i % len(templates)]
                questions.append({
                    "id": q_idx,
                    "question_text": tpl["question_text"],
                    "type": "MCQ",
                    "options": tpl["options"],
                    "correct_answer": tpl["correct_answer"],
                    "explanation": tpl["explanation"]
                })
            elif target_type == "TF":
                templates = [
                    {
                        "question_text": f"True or False: Understanding {display_topic} requires analyzing its fundamental components, relations, and context.",
                        "correct_answer": "True",
                        "explanation": f"Like most academic and practical subjects, {display_topic} is best understood by breaking it down into its constituent components and examining their relations."
                    },
                    {
                        "question_text": f"True or False: The principles governing {display_topic} are static and have never evolved over time.",
                        "correct_answer": "False",
                        "explanation": f"Our understanding and application of {display_topic} continue to develop alongside research, technological progress, and new insights."
                    },
                    {
                        "question_text": f"True or False: Practical applications of {display_topic} are completely independent of any theoretical models.",
                        "correct_answer": "False",
                        "explanation": "Theory and practice are closely linked; theoretical models inform practical applications and help guide decisions."
                    },
                    {
                        "question_text": f"True or False: Effective study of {display_topic} involves both memorization and conceptual understanding.",
                        "correct_answer": "True",
                        "explanation": "While terminology must be memorized, real proficiency comes from a deep conceptual understanding of the underlying principles."
                    },
                    {
                        "question_text": f"True or False: There is only one correct way to interpret or solve problems in {display_topic}.",
                        "correct_answer": "False",
                        "explanation": f"Many problems in {display_topic} have multiple valid interpretations or solutions depending on context and assumptions."
                    }
                ]
                tpl = templates[i % len(templates)]
                questions.append({
                    "id": q_idx,
                    "question_text": tpl["question_text"],
                    "type": "TF",
                    "options": ["True", "False"],
                    "correct_answer": tpl["correct_answer"],
                    "explanation": tpl["explanation"]
                })
            else: # Short Answer
                questions.append({
                    "id": q_idx,
                    "question_text": f"Explain the core mechanisms, advantages, and real-world applications of {display_topic}.",
                    "type": "Short",
                    "options": [],
                    "correct_answer": f"The core mechanisms of {display_topic} involve structured systematic implementation, optimization of processes, and application to relevant domains.",
                    "explanation": f"A comprehensive explanation of {display_topic} must address its principles, practical benefits, and standard use cases."
                })
    return questions

def generate_heuristic_questions(topic: str, quiz_type: str, num_questions: int, context: str) -> list:
    import re
    import random
    
    # 1. Clean the context and split into sentences properly, respecting newlines as potential sentence/heading boundaries
    # Split by double newlines or newlines followed by a capital letter
    raw_blocks = re.split(r'\n\s*\n|\n(?=[A-Z])', context)
    sentences = []
    for block in raw_blocks:
        block_sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', block)
        for s in block_sentences:
            s_clean = re.sub(r'\s+', ' ', s).strip()
            if s_clean:
                sentences.append(s_clean)
                
    # 2. Extract potential terms and definitions
    pattern = re.compile(
        r'\b([A-Z][A-Za-z0-9\s\-]{2,30}|[A-Za-z]{3,25})\s+(is|are|refers\s+to|is\s+defined\s+as|means|consists\s+of|represents)\s+([^.]{10,200})',
        re.IGNORECASE
    )
    
    STOP_WORDS = {
        "it", "they", "this", "these", "those", "there", "he", "she", "we", "you", 
        "i", "what", "which", "who", "whom", "whose", "that", "the", "a", "an",
        "here", "there", "their", "our", "its", "his", "her", "your", "my", "me", "them", "us"
    }
    
    definitions = []
    seen_terms = set()
    for sentence in sentences:
        match = pattern.search(sentence)
        if match:
            term = match.group(1).strip()
            relation = match.group(2).strip()
            definition = match.group(3).strip()
            
            # Clean term and definition
            term_clean = re.sub(r'\s+', ' ', term).strip()
            definition_clean = re.sub(r'\s+', ' ', definition).strip()
            
            # Check if term is clean, has valid length, and is not a stop word
            if (len(term_clean.split()) <= 4 and 
                term_clean.lower() not in STOP_WORDS and 
                term_clean.lower() not in seen_terms and
                len(term_clean) >= 3):
                
                seen_terms.add(term_clean.lower())
                definitions.append({
                    "term": term_clean,
                    "definition": definition_clean,
                    "relation": relation,
                    "sentence": sentence
                })

    questions = []
    q_idx = 1
    
    # Let's shuffle the definitions
    random.shuffle(definitions)
    
    for def_item in definitions[:num_questions]:
        term = def_item["term"]
        definition = def_item["definition"]
        relation = def_item["relation"]
        sentence = def_item["sentence"]
        
        target_type = quiz_type
        if quiz_type == "Mixed":
            target_type = "MCQ" if q_idx % 2 == 1 else "TF"
            
        if target_type == "MCQ":
            other_terms = [d["term"] for d in definitions if d["term"].lower() != term.lower()]
            random.shuffle(other_terms)
            options = [term] + other_terms[:3]
            while len(options) < 4:
                placeholders = ["General Concept", "Related Process", "Standard System", "Core Protocol"]
                for p in placeholders:
                    if p not in options:
                        options.append(p)
                        break
                if len(options) == 4:
                    break
            random.shuffle(options)
            
            questions.append({
                "id": q_idx,
                "question_text": f"Which term is defined as: \"{definition}\"?",
                "type": "MCQ",
                "options": options,
                "correct_answer": term,
                "explanation": f"According to the document: \"{sentence}\""
            })
        elif target_type == "TF":
            is_true = random.random() < 0.7
            if is_true or len(definitions) < 2:
                questions.append({
                    "id": q_idx,
                    "question_text": f"True or False: {term} {relation} {definition}.",
                    "type": "TF",
                    "options": ["True", "False"],
                    "correct_answer": "True",
                    "explanation": f"This is correct. According to the document: \"{sentence}\""
                })
            else:
                alt_item = random.choice([d for d in definitions if d["term"].lower() != term.lower()])
                alt_term = alt_item["term"]
                questions.append({
                    "id": q_idx,
                    "question_text": f"True or False: {alt_term} {relation} {definition}.",
                    "type": "TF",
                    "options": ["True", "False"],
                    "correct_answer": "False",
                    "explanation": f"This is incorrect. \"{definition}\" actually defines {term}, not {alt_term}."
                })
        else: # Short Answer or Fallback
            questions.append({
                "id": q_idx,
                "question_text": f"Define and explain the significance of the term '{term}' as mentioned in the document.",
                "type": "Short",
                "options": [],
                "correct_answer": f"{term} {relation} {definition}",
                "explanation": f"According to the document: \"{sentence}\""
            })
        q_idx += 1

    # 3. If we don't have enough definitions, fallback to sentence blanks
    if len(questions) < num_questions:
        remaining = num_questions - len(questions)
        interesting_sentences = [s.strip() for s in sentences if len(s.split()) >= 15 and len(s.split()) <= 40]
        random.shuffle(interesting_sentences)
        
        for s in interesting_sentences[:remaining]:
            words = s.split()
            candidate_indices = [i for i, w in enumerate(words) if len(w) > 5 and w[0].isupper() and w.isalpha()]
            if not candidate_indices:
                candidate_indices = [i for i, w in enumerate(words) if len(w) > 6 and w.isalpha()]
                
            candidate_indices = [i for i in candidate_indices if words[i].lower().strip(",.?!:;\"'") not in STOP_WORDS]
                
            if candidate_indices:
                blank_idx = random.choice(candidate_indices)
                correct_word = words[blank_idx].strip(",.?!:;\"'")
                words[blank_idx] = "______"
                question_text = " ".join(words)
                
                target_type = quiz_type
                if quiz_type == "Mixed":
                    target_type = "MCQ" if q_idx % 2 == 1 else "TF"
                    
                if target_type == "MCQ":
                    options = [correct_word]
                    other_words = list(set([w.strip(",.?!:;\"'") for w in words if len(w) > 4 and w != "______" and w.isalpha()]))
                    other_words = [w for w in other_words if w.lower() not in STOP_WORDS]
                    random.shuffle(other_words)
                    options += other_words[:3]
                    while len(options) < 4:
                        options.append("Concept")
                    random.shuffle(options)
                    
                    questions.append({
                        "id": q_idx,
                        "question_text": f"Complete the statement from the text:\n\"{question_text}\"",
                        "type": "MCQ",
                        "options": options,
                        "correct_answer": correct_word,
                        "explanation": f"The full sentence in the document is: \"{s}\""
                    })
                elif target_type == "TF":
                    questions.append({
                        "id": q_idx,
                        "question_text": f"True or False: According to the document, the following statement is correct: \"{s}\"",
                        "type": "TF",
                        "options": ["True", "False"],
                        "correct_answer": "True",
                        "explanation": f"According to the text: \"{s}\""
                    })
                else: # Short Answer
                    questions.append({
                        "id": q_idx,
                        "question_text": f"Explain what is referred to by the following statement:\n\"{s}\"",
                        "type": "Short",
                        "options": [],
                        "correct_answer": s,
                        "explanation": f"According to the text: \"{s}\""
                    })
                q_idx += 1

    # 4. Ultimate fallback to mock templates
    if len(questions) < num_questions:
        remaining = num_questions - len(questions)
        fallback_qs = generate_mock_questions(topic, quiz_type, remaining)
        for fq in fallback_qs:
            fq["id"] = q_idx
            questions.append(fq)
            q_idx += 1
            
    return questions[:num_questions]

def generate_mock_revision_schedule(topics: List[str]) -> dict:
    schedule_dict = {}
    start_date = date.today()
    
    # Spaced repetition intervals: Day 1, Day 3, Day 7
    intervals = [1, 3, 7]
    for idx, interval in enumerate(intervals):
        rev_date = start_date + timedelta(days=interval)
        date_str = rev_date.isoformat()
        
        tasks = []
        for t in topics:
            if idx == 0:
                tasks.append(f"Create summary sheets and active recall cards for {t}.")
            elif idx == 1:
                tasks.append(f"Complete spaced practice quiz and review wrong answers on {t}.")
            else:
                tasks.append(f"Conduct a rapid active recall test and teach key points of {t} aloud.")
                
        schedule_dict[date_str] = tasks
        
    return schedule_dict

def get_llm():
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL, 
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.3,
        max_retries=0
    )

async def generate_study_plan_ai(exam_date: date, daily_hours: float, subjects: List[str]) -> dict:
    """
    Generate a highly tailored study plan utilizing Gemini.
    """
    if not settings.is_gemini_key_valid():
        logger.warning("Invalid Gemini API key, falling back to mock study plan generator.")
        return generate_mock_study_plan(exam_date, daily_hours, subjects)

    import json
    llm = get_llm()
    
    today = date.today()
    system_prompt = (
        "You are an expert academic planner. Create a rigorous but realistic study plan for a student.\n"
        f"Today's date is {today.isoformat()}.\n"
        f"They have an exam on {exam_date.isoformat()}.\n"
        f"They can study {daily_hours} hours per day.\n"
        f"The subjects to cover are: {', '.join(subjects)}.\n"
        f"Generate a structured daily breakdown starting from today ({today.isoformat()}) until the exam date ({exam_date.isoformat()}).\n"
        f"CRITICAL: All generated task dates in daily_plan MUST be between today ({today.isoformat()}) and the exam date ({exam_date.isoformat()}) inclusive. "
        "You MUST NOT generate any dates in the past (before today) or after the exam date. If the exam date is very close, condense the study workload into the available days.\n"
        "Also generate weekly milestones.\n"
        "You MUST return a raw JSON object with the following structure:\n"
        "{{\n"
        '  "daily_plan": [\n'
        '    {{"date_str": "YYYY-MM-DD", "tasks": [{{"title": "task title", "hours": 2.0, "subject": "Math"}}]}}\n'
        "  ],\n"
        '  "weekly_plan": [\n'
        '    {{"week_id": "week_1", "milestone": "Master chapter 1"}}\n'
        "  ]\n"
        "}}\n"
        "Respond ONLY with valid JSON. No markdown formatting or code blocks."
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Generate the plan now.")
    ])
    
    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({})
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        result = json.loads(content.strip())
        
        # Convert output to dictionary matching the existing DB schema
        daily_dict = {}
        today_str = today.isoformat()
        exam_date_str = exam_date.isoformat()
        
        for day in result.get("daily_plan", []):
            date_str = day.get("date_str")
            if not date_str:
                continue
            # Filter dates to ensure they lie within [today, exam_date]
            if not (today_str <= date_str <= exam_date_str):
                logger.warning(f"Ignoring generated date outside valid study range: {date_str}")
                continue
                
            tasks_list = []
            for idx, t in enumerate(day.get("tasks", [])):
                tasks_list.append({
                    "id": f"task_{date_str}_{idx}",
                    "title": t["title"],
                    "hours": t["hours"],
                    "completed": False
                })
            daily_dict[date_str] = tasks_list
            
        weekly_dict = {}
        for w in result.get("weekly_plan", []):
            weekly_dict[w["week_id"]] = {
                "milestone": w["milestone"],
                "completed": False
            }
            
        return {
            "daily_plan": daily_dict,
            "weekly_plan": weekly_dict
        }
    except Exception as e:
        logger.warning(f"Failed to generate study plan via AI, falling back to mock generator: {e}")
        return generate_mock_study_plan(exam_date, daily_hours, subjects)

async def generate_quiz_ai(topic: str, document_id: Optional[str], quiz_type: str, num_questions: int) -> list:
    """
    Generate a quiz using Gemini. If document_id is provided, pulls context from Qdrant.
    Ensures questions are strictly focused on the document contents when available.
    """
    context = ""
    filename = ""
    if document_id:
        db = get_database()
        try:
            doc = await db["documents"].find_one({"_id": ObjectId(document_id)})
        except Exception:
            doc = await db["documents"].find_one({"_id": document_id})
        
        if doc and doc.get("qdrant_collection"):
            filename = doc.get("filename", "")
            collection_name = doc["qdrant_collection"]
            q_client = get_qdrant_client()
            # If a specific topic is provided, perform a similarity search to get the most relevant context
            if topic and topic.strip() and topic.lower() not in ["general study", "general", "none"]:
                try:
                    embed_model = get_embeddings()
                    vectorstore = Qdrant(
                        client=q_client,
                        collection_name=collection_name,
                        embeddings=embed_model
                    )
                    docs = vectorstore.similarity_search(query=topic, k=15)
                    if docs:
                        context = "\n".join([doc.page_content for doc in docs])
                        logger.info(f"Retrieved {len(docs)} relevant chunks for topic '{topic}' using similarity search.")
                except Exception as e:
                    logger.error(f"Error performing similarity search in Qdrant for collection {collection_name}: {e}")

            # Fallback to scroll if context is still empty
            if not context:
                try:
                    # Scroll points to get document chunks (limit to 20 chunks to optimize latency and token size)
                    points, _ = q_client.scroll(
                        collection_name=collection_name,
                        limit=20, 
                        with_payload=True,
                        with_vectors=False
                    )
                    if points:
                        context = "\n".join([p.payload.get("page_content", "") for p in points if p.payload])
                        logger.info(f"Retrieved {len(points)} chunks via scroll fallback for document {filename}.")
                except Exception as e:
                    logger.error(f"Error scrolling chunks from Qdrant for collection {collection_name}: {e}")

    if not settings.is_gemini_key_valid():
        logger.warning("Invalid Gemini API key, falling back to mock or heuristic quiz generator.")
        if context:
            return generate_heuristic_questions(topic, quiz_type, num_questions, context)
        return generate_mock_questions(topic, quiz_type, num_questions)

    import json
    llm = get_llm()
    
    if context:
        system_prompt = (
            "You are an expert professor. Generate exactly {num_questions} questions for a student "
            "based strictly and ONLY on the facts, concepts, and details present in the document text provided below.\n\n"
            "CRITICAL RULES:\n"
            "1. Focus strictly on the following topic: '{topic}' (if this is 'General Study', generate questions from any part of the document context).\n"
            "2. Every single question must be directly related to the provided document context. Do NOT generate general knowledge questions or questions from outside the text.\n"
            "3. Make the questions pinpoint, crisp, and challenging. Focus on key terms, definitions, explanations, formulas, or logical relationships mentioned in the text.\n"
            "4. The question type should be: {quiz_type} (MCQ, TF, Short, or Mixed).\n"
            "   - MCQ: Multiple Choice Questions with 4 realistic options (A, B, C, D) where only one is correct.\n"
            "   - TF: True/False questions (options must be exactly [\"True\", \"False\"]).\n"
            "   - Short: Short Answer questions where the options are empty or null.\n"
            "   - Mixed: A mixture of MCQs, TF, and Short Answer questions.\n"
            "5. Provide clear, detailed explanations for the correct answers referencing the facts in the text.\n"
            "6. You MUST return a raw JSON object with the following structure:\n"
            "{{\n"
            '  "questions": [\n'
            '    {{\n'
            '      "question_text": "Clean, crisp question here",\n'
            '      "type": "MCQ",\n'
            '      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '      "correct_answer": "Option A",\n'
            '      "explanation": "Explanation of why this option is correct based on the text."\n'
            '    }}\n'
            '  ]\n'
            "}}\n"
            "Respond ONLY with valid JSON. No markdown formatting, code blocks, or additional commentary.\n\n"
            "DOCUMENT CONTEXT:\n"
            "-------------------\n"
            "{context}\n"
            "-------------------\n"
        )
        human_prompt = "Generate the quiz based strictly on the document context now."
    else:
        system_prompt = (
            "You are an expert professor. Generate {num_questions} questions for a student "
            "on the following topic: {topic}.\n"
            "The question type should focus on: {quiz_type} (MCQ, TF, Short, or Mixed).\n"
            "Ensure the questions are challenging and academically accurate. Provide clear explanations for the correct answers.\n"
            "You MUST return a raw JSON object with the following structure:\n"
            "{{\n"
            '  "questions": [\n'
            '    {{\n'
            '      "question_text": "Question content here",\n'
            '      "type": "MCQ",\n'
            '      "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '      "correct_answer": "Option A",\n'
            '      "explanation": "Why this option is correct."\n'
            '    }}\n'
            '  ]\n'
            "}}\n"
            "For TF (True/False) questions, options should be [\"True\", \"False\"]. For Short Answer questions, options should be null or empty list.\n"
            "Respond ONLY with valid JSON. No markdown formatting or code blocks."
        )
        human_prompt = "Generate the quiz now."
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt)
    ])
    
    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({
            "num_questions": num_questions,
            "topic": topic,
            "quiz_type": quiz_type,
            "context": context
        })
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        result = json.loads(content.strip())
        
        questions_list = []
        for idx, q in enumerate(result.get("questions", [])):
            questions_list.append({
                "id": idx + 1,
                "question_text": q["question_text"],
                "type": q["type"],
                "options": q.get("options") or [],
                "correct_answer": q["correct_answer"],
                "explanation": q.get("explanation", "")
            })
            
        return questions_list
    except Exception as e:
        logger.warning(f"Failed to generate quiz via AI, falling back to mock or heuristic generator: {e}")
        if context:
            return generate_heuristic_questions(topic, quiz_type, num_questions, context)
        return generate_mock_questions(topic, quiz_type, num_questions)

# --- Revision Planner Models & Generator ---

class RevisionTask(BaseModel):
    task: str = Field(description="A specific actionable revision task")

class RevisionDay(BaseModel):
    date_str: str = Field(description="The date for this revision session in YYYY-MM-DD format")
    tasks: List[RevisionTask] = Field(description="List of tasks for this revision day")

class RevisionScheduleSchema(BaseModel):
    schedule: List[RevisionDay] = Field(description="A list of revision days using spaced repetition intervals")

async def generate_revision_schedule_ai(topics: List[str]) -> dict:
    """
    Generate a spaced-repetition revision schedule for weak topics.
    """
    if not settings.is_gemini_key_valid():
        logger.warning("Invalid Gemini API key, falling back to mock revision schedule generator.")
        return generate_mock_revision_schedule(topics)

    import json
    llm = get_llm()
    
    today = date.today()
    system_prompt = (
        "You are an expert academic planner specializing in Spaced Repetition. "
        f"Today's date is {today.isoformat()}.\n"
        "The student needs to revise the following weak topics: {topics}.\n"
        f"Generate a schedule starting from today ({today.isoformat()}) using spaced intervals (e.g. Day 1, Day 3, Day 7). "
        "For each revision day, provide specific, actionable study tasks focusing on mastering these topics.\n"
        "You MUST return a raw JSON object with the following structure:\n"
        "{{\n"
        '  "schedule": [\n'
        '    {{\n'
        '      "date_str": "YYYY-MM-DD",\n'
        '      "tasks": [\n'
        '        {{"task": "Revise topic X using active recall."}},\n'
        '        {{"task": "Solve 5 practice questions on Y."}}\n'
        '      ]\n'
        '    }}\n'
        '  ]\n'
        "}}\n"
        "Respond ONLY with valid JSON. No markdown formatting or code blocks."
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Generate the revision schedule now.")
    ])
    
    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({
            "topics": ", ".join(topics)
        })
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        result = json.loads(content.strip())
        
        # Convert to dictionary format
        schedule_dict = {}
        today_str = today.isoformat()
        for day in result.get("schedule", []):
            date_str = day.get("date_str")
            if date_str and date_str >= today_str:
                schedule_dict[date_str] = [t["task"] for t in day.get("tasks", [])]
            else:
                logger.warning(f"Ignoring generated revision date in the past: {date_str}")
            
        return schedule_dict
    except Exception as e:
        logger.warning(f"Failed to generate revision schedule via AI, falling back to mock generator: {e}")
        return generate_mock_revision_schedule(topics)

async def generate_document_summary_ai(filename: str, text: str) -> str:
    """
    Generate a study summary of a document using Gemini.
    """
    if not text.strip():
        return "The document does not contain any readable text to summarize."
        
    if not settings.is_gemini_key_valid():
        logger.warning("Invalid Gemini API key, falling back to mock summary.")
        # Generate a beautiful mock summary based on filename
        clean_name = filename.replace("_", " ").replace("-", " ")
        topic = clean_name.split(".")[0]
        return f"""# Study Guide: {topic}

## Executive Summary
This document provides a comprehensive overview of **{topic}**. It covers the fundamental principles, essential terminology, and practical applications of the subject matter, structured to facilitate rapid revision and long-term retention.

## Key Concepts & Definitions
*   **Core Concepts**: Primary definitions and building blocks of {topic}.
*   **Methodology**: Systematic processes, tools, and practices relevant to the topic.
*   **Paradigms**: Key frameworks used to analyze or implement solutions in this domain.

## Detailed Topic Breakdown
1.  **Introduction to {topic}**: Background context and basic concepts.
2.  **Fundamental Principles**: In-depth analysis of core components and relationships.
3.  **Real-world Applications**: Practical examples and case studies demonstrating implementation.
4.  **Challenges & Best Practices**: Troubleshooting, efficiency improvements, and common pitfalls.

## Actionable Study Plan & Next Steps
*   **Active Recall**: Test your understanding of terms defined in the document.
*   **Practice Quizzes**: Take the AI-generated quiz for {topic} to evaluate your exam readiness.
*   **Weekly Milestones**: Allocate 2-3 hours to review these core definitions.
"""

    llm = get_llm()
    
    # Truncate text if it is extremely long to prevent token limits
    max_chars = 50000
    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n[Content truncated due to length limits...]"
        
    system_prompt = (
        "You are an expert academic tutor. Summarize the provided document contents to help a student study efficiently.\n"
        "Generate a comprehensive, highly structured, and beautiful study guide in Markdown format. Use clear headings, detailed bullet points, and bold text for visual emphasis.\n"
        "Your guide MUST be organized point-wise and include the following sections:\n\n"
        "# Executive Summary\n"
        "Provide a detailed, high-level overview of the document in 2-3 detailed, point-wise paragraphs or bullet points explaining the background, target audience, and core objectives.\n\n"
        "# Key Concepts & Definitions\n"
        "List all critical terms, theories, and definitions mentioned in the text.\n"
        "Format each term as a separate bullet point: '* **[Term Name]**: [Detailed 2-3 sentence definition explaining why it is important and its context]'.\n\n"
        "# Detailed Topic Breakdown\n"
        "Create a structured hierarchical breakdown using subheadings (e.g. '## [Topic/Chapter Title]') for each major theme.\n"
        "Under each subheading, provide 4-5 descriptive, point-wise details (using bullet points). Explain key mechanisms, equations, processes, or arguments in depth (no short 1-line points).\n\n"
        "# Actionable Study Plan & Next Steps\n"
        "Provide practical study recommendations tailored to this content in a bulleted list:\n"
        "- Active Recall Questions: specific questions to test understanding of the material.\n"
        "- Recommended Quiz Topics: areas to focus on for evaluation.\n"
        "- Study Milestones: specific goals or timelines for mastering this material.\n\n"
        "CRITICAL FORMATTING RULES:\n"
        "1. Write everything in a clean, point-wise, structured manner. Avoid long paragraphs and monolithic blocks of text.\n"
        "2. Use bolding (`**term**`) for key terms and concepts.\n"
        "3. If there are formulas, equations, code snippets, or key data, highlight them using Markdown code blocks.\n"
        "4. Do not include any introductory or concluding conversational text. Start directly with '# Executive Summary'."
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Here is the document content for '{filename}':\n\n{text}")
    ])
    
    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({"text": text, "filename": filename})
        return response.content.strip()
    except Exception as e:
        logger.error(f"Failed to generate summary via Gemini: {e}")
        return f"Failed to generate AI summary: {str(e)}"
