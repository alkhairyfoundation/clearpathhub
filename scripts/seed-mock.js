const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const DATABASE_URL = process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('NEON_DATABASE_URL not found in .env.local');
  process.exit(1);
}

// ===================== QUESTION DATA =====================
const mathQuestions = [
  { no: 1, question: "Value of '7' in 45.072?", options: ["7 Tens", "7 Units", "7 Hundredths", "7 Thousandths"], answer: 2, topic: "Number Sense", difficulty: "EASY" },
  { no: 2, question: "Descending order: 2/3, 3/4, 5/8.", options: ["3/4, 2/3, 5/8", "5/8, 2/3, 3/4", "2/3, 3/4, 5/8", "3/4, 5/8, 2/3"], answer: 0, topic: "Number Sense", difficulty: "MEDIUM" },
  { no: 3, question: "If a:b=3:4 and b:c=5:6, find a:c.", options: ["1:2", "5:8", "3:6", "15:24"], answer: 1, topic: "Number Sense", difficulty: "HARD" },
  { no: 4, question: "Sale price N12,000 after 20% reduction. Original price?", options: ["N15,000", "N14,400", "N9,600", "N16,000"], answer: 0, topic: "Business Math", difficulty: "MEDIUM" },
  { no: 5, question: "0.0000405 in standard form.", options: ["4.05x10^-4", "4.05x10^-5", "40.5x10^-6", "4.05x10^5"], answer: 1, topic: "Number Sense", difficulty: "MEDIUM" },
  { no: 6, question: "6 men take 4 days for a wall. Men needed for 3 days?", options: ["8", "4.5", "9", "2"], answer: 0, topic: "Business Math", difficulty: "MEDIUM" },
  { no: 7, question: "Buy 50 oranges N2,500. 10 rotten. Sell rest N70 each. % Profit?", options: ["12%", "10%", "18%", "12%"], answer: 0, topic: "Business Math", difficulty: "HARD" },
  { no: 8, question: "Bells toll at 12, 15, 18 min. Start 8:00AM. Next together?", options: ["11:00AM", "9:30AM", "10:00AM", "12:00PM"], answer: 0, topic: "Number Sense", difficulty: "HARD" },
  { no: 9, question: "Interest on N50,000, 2yrs, 5% compounded annually.", options: ["N5,000", "N5,125", "N55,125", "N2,500"], answer: 1, topic: "Business Math", difficulty: "HARD" },
  { no: 10, question: "Convert 11011 in base 2 to base 10.", options: ["27", "25", "11", "31"], answer: 0, topic: "Number Sense", difficulty: "MEDIUM" },
  { no: 11, question: "Correct 0.04596 to 3 sig figures.", options: ["0.045", "0.0460", "0.046", "0.0459"], answer: 2, topic: "Number Sense", difficulty: "EASY" },
  { no: 12, question: "Evaluate: -15 - (-8) + (-3).", options: ["-26", "-10", "-4", "10"], answer: 1, topic: "Number Sense", difficulty: "EASY" },
  { no: 13, question: "$1=N1500, £1=N1900. How many USD for £300?", options: ["380", "237", "450", "300"], answer: 0, topic: "Business Math", difficulty: "HARD" },
  { no: 14, question: "Square root of 1 11/25.", options: ["1 1/5", "1 2/5", "1 4/5", "6/5"], answer: 0, topic: "Number Sense", difficulty: "MEDIUM" },
  { no: 15, question: "Class of 40: 25 like Math, 20 like Science, 5 like neither. Both?", options: ["15", "10", "5", "20"], answer: 1, topic: "Number Sense", difficulty: "HARD" },
  { no: 16, question: "Simplify 3a - 5b + 2a + 8b.", options: ["5a + 3b", "a + 13b", "5a + 13b", "5a - 3b"], answer: 0, topic: "Algebra", difficulty: "EASY" },
  { no: 17, question: "Simplify 3(x-4) - 2(x+5).", options: ["x-2", "x-22", "5x-22", "x+2"], answer: 1, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 18, question: "Factorize 4x² - 9y².", options: ["(2x-3y)²", "(4x-9y)(x+y)", "(2x-3y)(2x+3y)", "2(x-3y)(x+3y)"], answer: 2, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 19, question: "Make A subject: V=1/3Ah.", options: ["A=V/3h", "A=3V/h", "A=3Vh", "A=h/3V"], answer: 1, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 20, question: "Sum of 3 consecutive integers is 72. Largest?", options: ["23", "24", "25", "26"], answer: 2, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 21, question: "Evaluate (27)^(2/3).", options: ["9", "18", "3", "6"], answer: 0, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 22, question: "Solve: x+y=10, 2x-y=8.", options: ["x=6, y=4", "x=4, y=6", "x=2, y=8", "x=8, y=2"], answer: 0, topic: "Algebra", difficulty: "EASY" },
  { no: 23, question: "Solve 3x-5 < 10.", options: ["x<5", "x>5", "x<15", "x<1.6"], answer: 0, topic: "Algebra", difficulty: "EASY" },
  { no: 24, question: "Roots of x²-5x+6=0.", options: ["-2, -3", "2, 3", "1, 6", "-1, -6"], answer: 1, topic: "Algebra", difficulty: "EASY" },
  { no: 25, question: "Simplify x/2 + 2x/3.", options: ["3x/5", "7x/6", "3x/6", "x²/6"], answer: 1, topic: "Algebra", difficulty: "EASY" },
  { no: 26, question: "y varies directly as x. y=12 when x=4. y when x=7?", options: ["21", "28", "15", "11"], answer: 0, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 27, question: "p=-2, q=5. Value of 3p+2q?", options: ["4", "16", "-4", "1"], answer: 0, topic: "Algebra", difficulty: "EASY" },
  { no: 28, question: "Point on line y=2x-3?", options: ["(1,-1)", "(0,3)", "(2,4)", "(-1,-1)"], answer: 0, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 29, question: "Factorize ax+ay+bx+by.", options: ["(a+b)(x+y)", "(a+x)(b+y)", "ab(x+y)", "(ax+by)"], answer: 0, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 30, question: "Solve (x+2)/4 = (x-1)/3.", options: ["10", "7", "5", "2"], answer: 0, topic: "Algebra", difficulty: "MEDIUM" },
  { no: 31, question: "Interior angle of regular octagon?", options: ["120°", "135°", "140°", "150°"], answer: 1, topic: "Geometry", difficulty: "HARD" },
  { no: 32, question: "Pythagoras: legs 6, 8. Hypotenuse?", options: ["10", "12", "14", "15"], answer: 0, topic: "Geometry", difficulty: "EASY" },
  { no: 33, question: "Area triangle base 12, height 9.", options: ["54", "108", "42", "21"], answer: 0, topic: "Geometry", difficulty: "EASY" },
  { no: 34, question: "Circumference radius 7 (π=22/7).", options: ["22", "44", "49", "154"], answer: 1, topic: "Geometry", difficulty: "EASY" },
  { no: 35, question: "Volume cuboid 8x5x4.", options: ["160", "120", "80", "17"], answer: 0, topic: "Geometry", difficulty: "EASY" },
  { no: 36, question: "Complementary angle to 38°?", options: ["42°", "52°", "128°", "62°"], answer: 1, topic: "Geometry", difficulty: "EASY" },
  { no: 37, question: "Scale 1:500. 6cm drawing is scale?", options: ["3m", "30m", "300m", "600m"], answer: 1, topic: "Geometry", difficulty: "MEDIUM" },
  { no: 38, question: "A prism has:", options: ["1 base", "2 parallel congruent bases", "curved surface", "no edges"], answer: 1, topic: "Geometry", difficulty: "EASY" },
  { no: 39, question: "Surface area cube side 5.", options: ["25", "100", "150", "125"], answer: 2, topic: "Geometry", difficulty: "MEDIUM" },
  { no: 40, question: "Bearing of East?", options: ["090°", "180°", "270°", "360°"], answer: 0, topic: "Geometry", difficulty: "EASY" },
  { no: 41, question: "Gradient between (2,3) & (6,11).", options: ["2", "3", "4", "8"], answer: 0, topic: "Geometry", difficulty: "MEDIUM" },
  { no: 42, question: "Two triangles with equal angles are:", options: ["Congruent", "Similar", "Parallel", "Equal"], answer: 1, topic: "Geometry", difficulty: "EASY" },
  { no: 43, question: "Area circle radius 14 (π=22/7).", options: ["308", "616", "154", "44"], answer: 1, topic: "Geometry", difficulty: "MEDIUM" },
  { no: 44, question: "Angle at centre 100°. Angle at circumf?", options: ["25°", "40°", "50°", "100°"], answer: 2, topic: "Geometry", difficulty: "HARD" },
  { no: 45, question: "Ladder 13m reaches wall 5m from base. Height?", options: ["8", "10", "12", "15"], answer: 2, topic: "Geometry", difficulty: "MEDIUM" },
  { no: 46, question: "Mean of 5, 7, 8, 10, 10.", options: ["7", "8", "9", "10"], answer: 1, topic: "Statistics", difficulty: "EASY" },
  { no: 47, question: "Median of 2, 5, 7, 9, 12.", options: ["5", "6", "7", "9"], answer: 2, topic: "Statistics", difficulty: "EASY" },
  { no: 48, question: "Mode of 4, 5, 5, 6, 7, 7, 7, 8.", options: ["5", "6", "7", "8"], answer: 2, topic: "Statistics", difficulty: "EASY" },
  { no: 49, question: "Prob. getting head on fair coin toss.", options: ["0", "1/4", "1/2", "1"], answer: 2, topic: "Probability", difficulty: "EASY" },
  { no: 50, question: "Prob. rolling a 5 on fair die.", options: ["1/3", "1/5", "1/6", "5/6"], answer: 2, topic: "Probability", difficulty: "EASY" },
  { no: 51, question: "Range of 12, 18, 9, 25, 16.", options: ["13", "16", "25", "34"], answer: 1, topic: "Statistics", difficulty: "EASY" },
  { no: 52, question: "18 of 60 students prefer Football. %?", options: ["20%", "25%", "30%", "40%"], answer: 2, topic: "Statistics", difficulty: "EASY" },
  { no: 53, question: "Bag 3 red, 5 blue. Prob. Red?", options: ["3/5", "3/8", "5/8", "1/2"], answer: 1, topic: "Probability", difficulty: "EASY" },
  { no: 54, question: "Best graph for comparing categories?", options: ["Line", "Pie", "Bar", "Hist"], answer: 2, topic: "Statistics", difficulty: "EASY" },
  { no: 55, question: "Pie chart angle for 25%?", options: ["45°", "60°", "90°", "120°"], answer: 2, topic: "Statistics", difficulty: "MEDIUM" },
  { no: 56, question: "Mean of x, 4, 6 is 5. Find x.", options: ["3", "4", "5", "6"], answer: 2, topic: "Statistics", difficulty: "MEDIUM" },
  { no: 57, question: "Two coins tossed. Prob. 2 heads?", options: ["1/2", "1/3", "1/4", "3/4"], answer: 2, topic: "Probability", difficulty: "MEDIUM" },
  { no: 58, question: "Class 20-29 boundaries:", options: ["20,29", "19.5,29.5", "20.5,29.5", "19,30"], answer: 1, topic: "Statistics", difficulty: "MEDIUM" },
  { no: 59, question: "Most affected by extremes:", options: ["Mode", "Median", "Mean", "Range"], answer: 2, topic: "Statistics", difficulty: "MEDIUM" },
  { no: 60, question: "40% of 250 students prefer Science. Count?", options: ["80", "90", "100", "120"], answer: 2, topic: "Statistics", difficulty: "EASY" },
];

const basicScienceQuestions = [
  { no: 1, question: "Which is common to both plant and animal cells?", options: ["Cell Wall", "Large Vacuole", "Cell Membrane", "Chloroplasts"], answer: 2, topic: "Biology", difficulty: "EASY" },
  { no: 2, question: "Process by which green plants make food using sunlight:", options: ["Respiration", "Transpiration", "Photosynthesis", "Digestion"], answer: 2, topic: "Biology", difficulty: "EASY" },
  { no: 3, question: "Human organ responsible for gas exchange:", options: ["Heart", "Lungs", "Stomach", "Liver"], answer: 1, topic: "Biology", difficulty: "EASY" },
  { no: 4, question: "Role of fungi and bacteria in a food chain:", options: ["Producers", "Consumers", "Decomposers", "Predators"], answer: 2, topic: "Biology", difficulty: "EASY" },
  { no: 5, question: "A biotic factor in an ecosystem is:", options: ["Water", "Soil", "Bacteria", "Sunlight"], answer: 2, topic: "Biology", difficulty: "EASY" },
  { no: 6, question: "Movement of water through a semi-permeable membrane:", options: ["Osmosis", "Diffusion", "Active Transport", "Evaporation"], answer: 0, topic: "Biology", difficulty: "MEDIUM" },
  { no: 7, question: "Blood part responsible for carrying oxygen:", options: ["Plasma", "White cells", "Red blood cells", "Platelets"], answer: 2, topic: "Biology", difficulty: "EASY" },
  { no: 8, question: "Correct organization levels:", options: ["Cell-Tissue-Organ-System", "Organ-System-Cell-Tissue", "Tissue-Cell-Organ-System", "System-Organ-Tissue-Cell"], answer: 0, topic: "Biology", difficulty: "EASY" },
  { no: 9, question: "Vitamin C deficiency causes:", options: ["Rickets", "Scurvy", "Night blindness", "Beriberi"], answer: 1, topic: "Biology", difficulty: "MEDIUM" },
  { no: 10, question: "Organism belonging to Kingdom Fungi:", options: ["Amoeba", "Mushroom", "Spirogyra", "Moss"], answer: 1, topic: "Biology", difficulty: "EASY" },
  { no: 11, question: "Organ responsible for body balance:", options: ["Eye", "Nose", "Ear", "Tongue"], answer: 2, topic: "Biology", difficulty: "EASY" },
  { no: 12, question: "Main site for food absorption:", options: ["Large Intestine", "Small Intestine", "Stomach", "Mouth"], answer: 1, topic: "Biology", difficulty: "EASY" },
  { no: 13, question: "Flower part attracting insects:", options: ["Sepal", "Petal", "Stigma", "Anther"], answer: 1, topic: "Biology", difficulty: "EASY" },
  { no: 14, question: "An inherited character is:", options: ["Scars", "Language", "Eye color", "Knowledge"], answer: 2, topic: "Biology", difficulty: "MEDIUM" },
  { no: 15, question: "Removal of metabolic waste is:", options: ["Egestion", "Secretion", "Excretion", "Perspiration"], answer: 2, topic: "Biology", difficulty: "MEDIUM" },
  { no: 16, question: "Which is a physical change?", options: ["Burning paper", "Rusting iron", "Melting ice", "Cooking food"], answer: 2, topic: "Chemistry", difficulty: "EASY" },
  { no: 17, question: "Smallest particle of an element retaining properties:", options: ["Molecule", "Atom", "Cell", "Compound"], answer: 1, topic: "Chemistry", difficulty: "EASY" },
  { no: 18, question: "Which is a mixture?", options: ["Oxygen", "Water", "Air", "Gold"], answer: 2, topic: "Chemistry", difficulty: "EASY" },
  { no: 19, question: "An element is a substance that:", options: ["Is easily separated", "Has one type of atom", "Is always liquid", "Is a compound"], answer: 1, topic: "Chemistry", difficulty: "EASY" },
  { no: 20, question: "Process to separate sand from water:", options: ["Evaporation", "Filtration", "Distillation", "Chromatography"], answer: 1, topic: "Chemistry", difficulty: "EASY" },
  { no: 21, question: "Definite shape and definite volume is a:", options: ["Gas", "Liquid", "Solid", "Plasma"], answer: 2, topic: "Chemistry", difficulty: "EASY" },
  { no: 22, question: "Chemical symbol for Sodium:", options: ["So", "Sd", "Na", "S"], answer: 2, topic: "Chemistry", difficulty: "EASY" },
  { no: 23, question: "Vinegar reacting with baking soda to produce gas is:", options: ["Physical change", "Chemical change", "Melting", "Dissolving"], answer: 1, topic: "Chemistry", difficulty: "EASY" },
  { no: 24, question: "Which is a compound?", options: ["Iron", "Sulphur", "Carbon dioxide", "Copper"], answer: 2, topic: "Chemistry", difficulty: "EASY" },
  { no: 25, question: "Liquid changing to gas at the surface:", options: ["Freezing", "Condensation", "Evaporation", "Sublimation"], answer: 2, topic: "Chemistry", difficulty: "EASY" },
  { no: 26, question: "Apparatus for accurate liquid volume:", options: ["Beaker", "Conical flask", "Measuring cylinder", "Test tube"], answer: 2, topic: "Chemistry", difficulty: "EASY" },
  { no: 27, question: "pH of a neutral substance:", options: ["0", "7", "10", "14"], answer: 1, topic: "Chemistry", difficulty: "EASY" },
  { no: 28, question: "Identification of an acid:", options: ["Soap", "Lemon juice", "Baking soda", "Ammonia"], answer: 1, topic: "Chemistry", difficulty: "EASY" },
  { no: 29, question: "Matter has:", options: ["Vision only", "Mass and space", "Solid state only", "Color only"], answer: 1, topic: "Chemistry", difficulty: "EASY" },
  { no: 30, question: "Lab safety rule:", options: ["Taste chemicals", "Smell directly", "Use PPE/Follow rules", "Mix unknowns"], answer: 2, topic: "Chemistry", difficulty: "EASY" },
  { no: 31, question: "A force is:", options: ["Motion energy", "Push or pull", "Speed", "Weight"], answer: 1, topic: "Physics", difficulty: "EASY" },
  { no: 32, question: "SI unit of force:", options: ["Joule", "Watt", "Newton", "Pascal"], answer: 2, topic: "Physics", difficulty: "EASY" },
  { no: 33, question: "Form of energy:", options: ["Friction", "Heat", "Mass", "Density"], answer: 1, topic: "Physics", difficulty: "EASY" },
  { no: 34, question: "Work is done when:", options: ["Force moves object", "Lifting without move", "Thinking", "Stationary"], answer: 0, topic: "Physics", difficulty: "EASY" },
  { no: 35, question: "Simple machine for well bucket:", options: ["Lever", "Pulley", "Wheel-axle", "Inclined plane"], answer: 1, topic: "Physics", difficulty: "EASY" },
  { no: 36, question: "Heat transfer in solids:", options: ["Convection", "Radiation", "Conduction", "Evaporation"], answer: 2, topic: "Physics", difficulty: "EASY" },
  { no: 37, question: "Most refracted color in prism:", options: ["Red", "Yellow", "Green", "Violet"], answer: 3, topic: "Physics", difficulty: "MEDIUM" },
  { no: 38, question: "Why use convex mirrors in cars?", options: ["Magnification", "Wider field of view", "Inverted image", "Focus light"], answer: 1, topic: "Physics", difficulty: "MEDIUM" },
  { no: 39, question: "Flow of electric charges:", options: ["Voltage", "Resistance", "Current", "Power"], answer: 2, topic: "Physics", difficulty: "EASY" },
  { no: 40, question: "Best conductor:", options: ["Plastic", "Rubber", "Copper", "Wood"], answer: 2, topic: "Physics", difficulty: "EASY" },
  { no: 41, question: "Instrument for current:", options: ["Voltmeter", "Ammeter", "Thermometer", "Barometer"], answer: 1, topic: "Physics", difficulty: "EASY" },
  { no: 42, question: "Renewable energy source:", options: ["Coal", "Petroleum", "Natural gas", "Solar"], answer: 3, topic: "Physics", difficulty: "EASY" },
  { no: 43, question: "Magnet attracts:", options: ["Aluminium", "Copper", "Iron", "Plastic"], answer: 2, topic: "Physics", difficulty: "EASY" },
  { no: 44, question: "Sound cannot travel through:", options: ["Solids", "Liquids", "Gases", "Vacuum"], answer: 3, topic: "Physics", difficulty: "EASY" },
  { no: 45, question: "Seat belts work via:", options: ["Weight reduction", "Friction", "Inertia/Newton 1st Law", "Speed increase"], answer: 2, topic: "Physics", difficulty: "MEDIUM" },
  { no: 46, question: "The Red Planet is:", options: ["Venus", "Mars", "Jupiter", "Saturn"], answer: 1, topic: "Earth Science", difficulty: "EASY" },
  { no: 47, question: "Ozone depletion cause:", options: ["CO2", "CFCs", "Oxygen", "Nitrogen"], answer: 1, topic: "Earth Science", difficulty: "EASY" },
  { no: 48, question: "First step of scientific method:", options: ["Conclusion", "Experiment", "Observation", "Hypothesis"], answer: 2, topic: "Earth Science", difficulty: "EASY" },
  { no: 49, question: "Anopheles mosquito carries:", options: ["Cholera", "Malaria", "Tuberculosis", "Typhoid"], answer: 1, topic: "Earth Science", difficulty: "EASY" },
  { no: 50, question: "Natural wearing of Earth's surface:", options: ["Deposition", "Erosion", "Crystallization", "Photosynthesis"], answer: 1, topic: "Earth Science", difficulty: "EASY" },
  { no: 51, question: "Measure humidity with:", options: ["Barometer", "Anemometer", "Hygrometer", "Rain gauge"], answer: 2, topic: "Earth Science", difficulty: "MEDIUM" },
  { no: 52, question: "A scientific prediction is a:", options: ["Theory", "Law", "Conclusion", "Hypothesis"], answer: 3, topic: "Earth Science", difficulty: "MEDIUM" },
  { no: 53, question: "Non-renewable resource:", options: ["Wind", "Crude oil", "Sunlight", "Tides"], answer: 1, topic: "Earth Science", difficulty: "EASY" },
  { no: 54, question: "24-hour axial rotation cause:", options: ["Seasons", "Day and Night", "Eclipses", "Tides"], answer: 1, topic: "Earth Science", difficulty: "EASY" },
  { no: 55, question: "Definition of drug abuse:", options: ["Prescription use", "Fun use", "Excessive/Wrong use", "Pharmacy sales"], answer: 2, topic: "Earth Science", difficulty: "MEDIUM" },
  { no: 56, question: "Experimental constant variable example:", options: ["Sunlight", "Water amount", "Soil type", "All of above"], answer: 3, topic: "Earth Science", difficulty: "MEDIUM" },
  { no: 57, question: "Industrial water pollution source:", options: ["Recycling", "Chemical waste", "Trees", "Boiling"], answer: 1, topic: "Earth Science", difficulty: "EASY" },
  { no: 58, question: "Scientific ethics involves:", options: ["High cost", "Honesty/Safety", "Winning", "Ignoring data"], answer: 1, topic: "Earth Science", difficulty: "EASY" },
  { no: 59, question: "Sustainable development means:", options: ["Exhaustion", "Future protection", "No growth", "Profit only"], answer: 1, topic: "Earth Science", difficulty: "MEDIUM" },
  { no: 60, question: "Diagnostic insight - identifies awareness of broad applications and global impacts of science.", options: ["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"], answer: 1, topic: "Earth Science", difficulty: "MEDIUM" },
];

const basicTechQuestions = [
  { no: 1, question: "Which wood property refers to its ability to resist indentation?", options: ["Density", "Hardness", "Elasticity", "Color"], answer: 1, topic: "Materials", difficulty: "EASY" },
  { no: 2, question: "The process of preventing wood from decaying by applying chemicals is:", options: ["Seasoning", "Preservation", "Felling", "Conversion"], answer: 1, topic: "Materials", difficulty: "EASY" },
  { no: 3, question: "Identify the non-ferrous metal:", options: ["Mild Steel", "Cast Iron", "Aluminium", "Stainless Steel"], answer: 2, topic: "Materials", difficulty: "EASY" },
  { no: 4, question: "What is an alloy?", options: ["A pure metal", "A mixture of two or more metals", "A type of plastic", "A liquid metal"], answer: 1, topic: "Materials", difficulty: "EASY" },
  { no: 5, question: "Which plastic can be re-melted and reshaped after cooling?", options: ["Thermosetting", "Thermoplastics", "Rubber", "Ceramics"], answer: 1, topic: "Materials", difficulty: "EASY" },
  { no: 6, question: "A 'Try-square' is used in the workshop for:", options: ["Measuring weight", "Testing squareness of surfaces", "Cutting wood", "Planting trees"], answer: 1, topic: "Tools", difficulty: "EASY" },
  { no: 7, question: "Which tool is used for making fine holes in wood before driving a screw?", options: ["Chisel", "Bradawl", "Mallet", "Sledgehammer"], answer: 1, topic: "Tools", difficulty: "MEDIUM" },
  { no: 8, question: "In metal work, the 'Hacksaw' is used for:", options: ["Smoothing", "Cutting", "Measuring", "Welding"], answer: 1, topic: "Tools", difficulty: "EASY" },
  { no: 9, question: "Common causes of workshop accidents include:", options: ["Using PPE", "Carelessness and Horseplay", "Following instructions", "Keeping a clean floor"], answer: 1, topic: "Safety", difficulty: "EASY" },
  { no: 10, question: "Which marking tool is used to draw circles on metal sheets?", options: ["Ruler", "Scriber", "Divider", "Chalk"], answer: 2, topic: "Tools", difficulty: "EASY" },
  { no: 11, question: "The process of drying out excess moisture from timber is:", options: ["Preservation", "Seasoning", "Felling", "Paving"], answer: 1, topic: "Materials", difficulty: "EASY" },
  { no: 12, question: "Which machine tool is used for producing holes in workpieces?", options: ["Lathe", "Drilling machine", "Shaper", "Grinder"], answer: 1, topic: "Tools", difficulty: "EASY" },
  { no: 13, question: "A tool used for driving in and removing nails is:", options: ["Pliers", "Screwdriver", "Claw Hammer", "Bench Hook"], answer: 2, topic: "Tools", difficulty: "EASY" },
  { no: 14, question: "Which of these is a synthetic rubber?", options: ["Latex", "Neoprene", "Timber", "Clay"], answer: 1, topic: "Materials", difficulty: "MEDIUM" },
  { no: 15, question: "The 'Mallet' is often made from:", options: ["Steel", "Hardwood or Rubber", "Glass", "Ceramic"], answer: 1, topic: "Tools", difficulty: "EASY" },
  { no: 16, question: "Ferrous metals contain primarily:", options: ["Copper", "Iron", "Lead", "Zinc"], answer: 1, topic: "Materials", difficulty: "EASY" },
  { no: 17, question: "Ceramics are characterized by their high resistance to:", options: ["Heat", "Electricity", "Corrosion", "All of the above"], answer: 3, topic: "Materials", difficulty: "EASY" },
  { no: 18, question: "What does PPE stand for in technology?", options: ["Personal Phone Equipment", "Personal Protective Equipment", "Private Power Engine", "Professional Plan Entry"], answer: 1, topic: "Safety", difficulty: "EASY" },
  { no: 19, question: "Which of these is an example of a hand-powered cutting tool?", options: ["Cross-cut saw", "Lathe machine", "Circular saw", "Chainsaw"], answer: 0, topic: "Tools", difficulty: "EASY" },
  { no: 20, question: "The property that allows a metal to be drawn into thin wires is:", options: ["Malleability", "Ductility", "Brittleness", "Hardness"], answer: 1, topic: "Materials", difficulty: "MEDIUM" },
  { no: 21, question: "A 'T-Square' is used specifically for drawing:", options: ["Vertical lines", "Horizontal lines", "Circles", "Arcs"], answer: 1, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 22, question: "What is the angle of a Set-square typically available in a drawing set?", options: ["30/60 and 45 degrees", "10 and 20 degrees", "100 degrees", "5 and 15 degrees"], answer: 0, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 23, question: "In technical drawing, 'Hidden Details' are represented by:", options: ["Thin continuous lines", "Thick continuous lines", "Short dashes", "Chain lines"], answer: 2, topic: "Technical Drawing", difficulty: "MEDIUM" },
  { no: 24, question: "The 'Protractor' is used for measuring and drawing:", options: ["Length", "Weight", "Angles", "Volume"], answer: 2, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 25, question: "Isometric drawing is a method of representing a 3D object on a 2D plane at an angle of:", options: ["15 degrees", "30 degrees", "60 degrees", "90 degrees"], answer: 1, topic: "Technical Drawing", difficulty: "MEDIUM" },
  { no: 26, question: "Which type of pencil is the hardest?", options: ["2B", "HB", "4H", "6B"], answer: 2, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 27, question: "A 'Compass' is an instrument used for drawing:", options: ["Straight lines", "Circles and Arcs", "Squares", "Triangles"], answer: 1, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 28, question: "The side view of an object in Orthographic Projection is called the:", options: ["Plan", "Front Elevation", "End Elevation", "Perspective"], answer: 2, topic: "Technical Drawing", difficulty: "MEDIUM" },
  { no: 29, question: "'Freehand sketching' refers to drawing without the use of:", options: ["Paper", "Pencils", "Instruments/Rulers", "Imagination"], answer: 2, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 30, question: "Dimensions are placed on drawings to show:", options: ["The colors", "The brand name", "Accurate sizes/measurements", "The creator's name"], answer: 2, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 31, question: "The scale 1:2 on a drawing means the drawing is:", options: ["Twice the size of the object", "Half the size of the object", "Same size", "Five times larger"], answer: 1, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 32, question: "Which drawing shows an object as it appears to the eye from a single point?", options: ["Perspective", "Isometric", "Oblique", "Orthographic"], answer: 0, topic: "Technical Drawing", difficulty: "MEDIUM" },
  { no: 33, question: "A 'Border Line' is usually drawn how many millimeters from the edge of the paper?", options: ["1mm", "10-15mm", "100mm", "50mm"], answer: 1, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 34, question: "Which line is used for showing center of circles and symmetry?", options: ["Thick line", "Short dash line", "Long chain line (Dash-Dot)", "Zig-zag line"], answer: 2, topic: "Technical Drawing", difficulty: "MEDIUM" },
  { no: 35, question: "Modern design often uses CAD. CAD stands for:", options: ["Car And Driver", "Computer Aided Design", "Creative Art Department", "Calculation And Division"], answer: 1, topic: "Technical Drawing", difficulty: "EASY" },
  { no: 36, question: "Mechanical energy is the sum of:", options: ["Potential and Kinetic Energy", "Heat and Light", "Solar and Wind", "Sound and Electricity"], answer: 0, topic: "Energy", difficulty: "EASY" },
  { no: 37, question: "Which device converts chemical energy to electrical energy?", options: ["Generator", "Electric Motor", "Battery", "Light bulb"], answer: 2, topic: "Energy", difficulty: "EASY" },
  { no: 38, question: "The 'Transistor' is a component commonly found in:", options: ["Bicycles", "Electronic circuits", "Gas stoves", "Water pipes"], answer: 1, topic: "Electronics", difficulty: "EASY" },
  { no: 39, question: "Gear ratio is calculated by dividing the number of teeth on the:", options: ["Driven gear by Driver gear", "Wheel by axle", "Pulley by belt", "Screwdriver by screw"], answer: 0, topic: "Mechanics", difficulty: "MEDIUM" },
  { no: 40, question: "A student with very high scores in Technical Drawing & Materials but lower in English/Biology is a primary candidate for:", options: ["Nursing", "Engineering/Technical Track", "Accounting", "Law"], answer: 1, topic: "Mechanics", difficulty: "MEDIUM" },
];

const englishPart1Questions = [
  { no: 1, question: "Neither the teacher nor the students ____ aware of the announcement.", options: ["was", "were", "has been", "are"], answer: 1, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 2, question: "By the time the bell rang, the students ____ their work.", options: ["finished", "have finished", "had finished", "finish"], answer: 2, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 3, question: "Choose the correctly punctuated sentence:", options: ["The boys bags were lost.", "The boy's bags were lost.", "The boys' bags' were lost.", "The boys' bags were lost."], answer: 3, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 4, question: "Unless you study hard, you ____ pass the examination.", options: ["will", "would", "won't", "wouldn't"], answer: 2, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 5, question: "The committee ____ still debating the new policy.", options: ["are", "is", "have been", "were"], answer: 1, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 6, question: "Which of these is a Prepositional Phrase?", options: ["The big dog", "In the morning", "Running fast", "He cried"], answer: 1, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 7, question: 'Change to Passive Voice: "The chef cooked a delicious meal."', options: ["A delicious meal is cooked.", "A delicious meal was cooked by the chef.", "The chef was cooking.", "Delicious was the meal."], answer: 1, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 8, question: 'Identify the Adverb in: "The old man walked very slowly."', options: ["Old", "Walked", "Slowly", "Very"], answer: 2, topic: "Grammar", difficulty: "EASY" },
  { no: 9, question: "Each of the girls ____ a unique talent.", options: ["has", "have", "having", "are having"], answer: 0, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 10, question: "Identify the correctly spelled word:", options: ["Accomodation", "Accommodation", "Acomodation", "Accomodation"], answer: 1, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 11, question: '"If I ____ you, I would accept the offer."', options: ["am", "was", "were", "be"], answer: 2, topic: "Grammar", difficulty: "HARD" },
  { no: 12, question: "She has lived in Lagos ____ ten years.", options: ["since", "for", "during", "about"], answer: 1, topic: "Grammar", difficulty: "EASY" },
  { no: 13, question: "Identify the Objective Case pronoun:", options: ["I", "He", "Us", "They"], answer: 2, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 14, question: '"The sun rises in the east." What tense is this?', options: ["Simple Present", "Present Continuous", "Future", "Past"], answer: 0, topic: "Grammar", difficulty: "EASY" },
  { no: 15, question: 'Identify the Indirect Object: "Musa gave his sister a book."', options: ["Musa", "Gave", "His sister", "A book"], answer: 2, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 16, question: 'Choose the correct Question Tag: "You are coming to the party, ____?"', options: ["will you", "aren't you", "don't you", "is it"], answer: 1, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 17, question: "Which word is an Abstract Noun?", options: ["Table", "Bravery", "Teacher", "River"], answer: 1, topic: "Grammar", difficulty: "EASY" },
  { no: 18, question: "The suitcase is ____ heavy for me to lift.", options: ["so", "very", "too", "much"], answer: 2, topic: "Grammar", difficulty: "MEDIUM" },
  { no: 19, question: 'Choose the appropriate Conjunction: "He was tired, ____ he finished the race."', options: ["and", "but", "so", "because"], answer: 1, topic: "Grammar", difficulty: "EASY" },
  { no: 20, question: '"The cat sat on the mat." Is \'sat\' Transitive or Intransitive?', options: ["Transitive", "Intransitive", "Auxiliary", "Modal"], answer: 1, topic: "Grammar", difficulty: "MEDIUM" },
];

const englishPart2Questions = [
  { no: 21, question: "The word closest in meaning to diligent is:", options: ["Lazy", "Careful", "Hardworking", "Weak"], answer: 2, topic: "Vocabulary", difficulty: "EASY" },
  { no: 22, question: "The opposite of scarce is:", options: ["Rare", "Plenty", "Empty", "Small"], answer: 1, topic: "Vocabulary", difficulty: "EASY" },
  { no: 23, question: "She was elated after hearing the news. Elated means:", options: ["Angry", "Excited", "Confused", "Worried"], answer: 1, topic: "Vocabulary", difficulty: "EASY" },
  { no: 24, question: "Choose the correctly completed idiom: 'Break the ____.'", options: ["Stone", "Glass", "Ice", "Wall"], answer: 2, topic: "Vocabulary", difficulty: "MEDIUM" },
  { no: 25, question: "The teacher's explanation was explicit. Explicit means:", options: ["Clear", "Hidden", "Difficult", "Doubtful"], answer: 0, topic: "Vocabulary", difficulty: "EASY" },
  { no: 26, question: "Choose the word that best completes: 'The manager gave a _____ speech.'", options: ["motivate", "motivating", "motivation", "motivatedly"], answer: 1, topic: "Vocabulary", difficulty: "MEDIUM" },
  { no: 27, question: "Choose the odd word:", options: ["Apple", "Orange", "Banana", "Carrot"], answer: 3, topic: "Vocabulary", difficulty: "EASY" },
  { no: 28, question: "'Hit the nail on the head' means:", options: ["Make a mistake", "Be exactly right", "Work hard", "Build something"], answer: 1, topic: "Vocabulary", difficulty: "MEDIUM" },
  { no: 29, question: "In 'The river overflowed its banks', banks means:", options: ["Financial institutions", "River edges", "Chairs", "Buildings"], answer: 1, topic: "Vocabulary", difficulty: "EASY" },
  { no: 30, question: "Choose the closest meaning of fragile:", options: ["Strong", "Delicate", "Heavy", "Thick"], answer: 1, topic: "Vocabulary", difficulty: "EASY" },
  { no: 31, question: "The opposite of expand is:", options: ["Increase", "Stretch", "Contract", "Grow"], answer: 2, topic: "Vocabulary", difficulty: "EASY" },
  { no: 32, question: "'Once in a blue moon' means:", options: ["Every day", "Very rarely", "At night", "Unexpectedly"], answer: 1, topic: "Vocabulary", difficulty: "MEDIUM" },
  { no: 33, question: "The scientist's ideas were innovative. Innovative means:", options: ["Old-fashioned", "New and creative", "Ordinary", "Confusing"], answer: 1, topic: "Vocabulary", difficulty: "EASY" },
  { no: 34, question: "Choose the best word: 'His argument was _____ because it was supported by evidence.'", options: ["valid", "vacant", "vague", "violent"], answer: 0, topic: "Vocabulary", difficulty: "MEDIUM" },
  { no: 35, question: "The word resilient most nearly means:", options: ["Easily broken", "Able to recover quickly", "Careless", "Silent"], answer: 1, topic: "Vocabulary", difficulty: "MEDIUM" },
];

const englishPart3Questions = [
  { no: 36, question: 'The phrase "gnarled like old tree roots" suggests that Mr. Okoro\'s hands were:', options: ["Weak and trembling", "Twisted and aged", "Strong and young", "Dirty and unkept"], answer: 1, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 37, question: 'Why did the villagers call Mr. Okoro a "relic"?', options: ["Because he was very wealthy", "Because he worked in a dusty shop", "Because he dealt with old technology", "Because he didn't like children"], answer: 2, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 38, question: "The young man's attitude toward the wall clocks can be described as:", options: ["Envious", "Scornful", "Appreciative", "Indifferent"], answer: 1, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 39, question: 'What ironically brought the young man to the "relic-filled" shop?', options: ["His digital phone was broken", "He wanted to buy a new clock", "A sentimental mechanical watch", "He was hiding from the heat"], answer: 2, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 40, question: '"Surgical precision" in the passage implies that Mr. Okoro was:', options: ["A retired doctor", "Extremely careful and exact", "Very fast and efficient", "Planning to buy new tools"], answer: 1, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 41, question: "What is the primary reason for moving toward renewable energy?", options: ["High cost of labor", "Environmental impact of fossil fuels", "Global population decrease", "Lack of coal mines"], answer: 1, topic: "Reading Comprehension", difficulty: "EASY" },
  { no: 42, question: 'The word "intermittent" in the passage suggests that wind and sun are:', options: ["Always available", "Not constantly available", "Extremely dangerous", "Very cheap to use"], answer: 1, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 43, question: 'According to the passage, what is needed to fix the problem of "intermittency"?', options: ["More coal mines", "Larger power grids", "Advanced battery storage", "Lower electricity demand"], answer: 2, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 44, question: "For Nigeria, what is an advantage of solar power mentioned in the text?", options: ["Low initial cost", "Decentralized solutions to outages", "It works without batteries", "It is a fossil fuel"], answer: 1, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 45, question: 'The word "hurdle" in the final sentence most nearly means:', options: ["Assistance", "Track", "Barrier", "Success"], answer: 2, topic: "Reading Comprehension", difficulty: "EASY" },
  { no: 46, question: "The general tone of Passage B is:", options: ["Argumentative", "Informative and analytical", "Humorous", "Relieved"], answer: 1, topic: "Reading Comprehension", difficulty: "EASY" },
  { no: 47, question: "Does the author believe the transition to green energy is easy?", options: ["Yes, because it is cheap", "No, because of technical and cost obstacles", "Yes, because everyone wants it", "No, because coal is better"], answer: 1, topic: "Reading Comprehension", difficulty: "EASY" },
  { no: 48, question: '"Global demand for electricity surges..." What is a synonym for surges here?', options: ["Drops", "Stabilizes", "Increases rapidly", "Stops"], answer: 2, topic: "Reading Comprehension", difficulty: "EASY" },
  { no: 49, question: "If a student scores poorly on Passage B but well on Passage A, they may lack:", options: ["General literacy", "Scientific/Informational reading skills", "Imagination", "Vocabulary"], answer: 1, topic: "Reading Comprehension", difficulty: "MEDIUM" },
  { no: 50, question: "The author implies that the future of power grids depends on:", options: ["Traditional fuel", "Technology and policy shifts", "Market prices alone", "Wind speed only"], answer: 1, topic: "Reading Comprehension", difficulty: "HARD" },
];

const englishPart4Questions = [
  { no: 51, question: "The main idea of the passage is that:", options: ["Technology should replace teachers.", "Technology improves learning only when used responsibly.", "Digital libraries are expensive.", "Students should study online only."], answer: 1, topic: "Summary", difficulty: "MEDIUM" },
  { no: 52, question: "Which sentence best summarizes the passage?", options: ["Students enjoy technology.", "Technology is useful, but responsible use and digital literacy are essential.", "Schools should stop using books.", "Online lessons are always better."], answer: 1, topic: "Summary", difficulty: "MEDIUM" },
  { no: 53, question: "The word 'discipline' in the passage refers to:", options: ["Punishment", "Self-control", "School rules", "Military training"], answer: 1, topic: "Summary", difficulty: "EASY" },
  { no: 54, question: "Which statement is supported by the passage?", options: ["Technology guarantees success.", "Every student learns the same way.", "Schools should teach responsible technology use.", "Digital devices should be banned."], answer: 2, topic: "Summary", difficulty: "MEDIUM" },
  { no: 55, question: "The author's purpose is to:", options: ["Entertain", "Persuade through balanced information", "Tell a story", "Advertise technology"], answer: 1, topic: "Critical Thinking", difficulty: "MEDIUM" },
  { no: 56, question: "If the passage continued, the next paragraph would most likely discuss:", options: ["Ways schools can teach digital literacy.", "Ancient history.", "Sports competitions.", "Weather patterns."], answer: 0, topic: "Critical Thinking", difficulty: "MEDIUM" },
  { no: 57, question: "Which conclusion is most reasonable?", options: ["Technology should never be used in schools.", "Responsible use of technology supports learning.", "Students learn without teachers.", "Digital devices reduce intelligence."], answer: 1, topic: "Critical Thinking", difficulty: "EASY" },
  { no: 58, question: "Which option contains the strongest supporting detail?", options: ["Students like phones.", "Digital libraries and interactive simulations expand learning opportunities.", "Technology is colourful.", "Every child owns a computer."], answer: 1, topic: "Critical Thinking", difficulty: "MEDIUM" },
  { no: 59, question: "Which statement shows critical thinking?", options: ["I agree because everyone says so.", "The argument is convincing because it acknowledges both benefits and limitations.", "Technology is always good.", "Technology is always bad."], answer: 1, topic: "Critical Thinking", difficulty: "MEDIUM" },
  { no: 60, question: "A student who performs poorly in this section most likely needs additional support in:", options: ["Memorising vocabulary only", "Summarising ideas, evaluating arguments and critical reading", "Handwriting", "Pronunciation"], answer: 1, topic: "Critical Thinking", difficulty: "MEDIUM" },
];

function buildQuestions(subject, questions, subjectName) {
  const clusterTopics = {
    'MATHEMATICS': { 'Number Sense': 'Number & Business Math', 'Business Math': 'Number & Business Math', 'Algebra': 'Algebraic Processes', 'Geometry': 'Geometry & Measurement', 'Statistics': 'Statistics', 'Probability': 'Statistics' },
    'BASIC SCIENCE': { 'Biology': 'Biology', 'Chemistry': 'Chemistry', 'Physics': 'Physics', 'Earth Science': 'Inquiry & Integrated Science' },
    'BASIC TECHNOLOGY': { 'Materials': 'Materials, Tools & Safety', 'Tools': 'Materials, Tools & Safety', 'Safety': 'Materials, Tools & Safety', 'Technical Drawing': 'Drawing & Design', 'Energy': 'Drawing & Design', 'Electronics': 'Drawing & Design', 'Mechanics': 'Drawing & Design' },
    'ENGLISH': { 'Grammar': 'Grammar & Structure', 'Vocabulary': 'Vocabulary & Lexis', 'Reading Comprehension': 'Reading Comprehension', 'Summary': 'Summary & Critical Thinking', 'Critical Thinking': 'Summary & Critical Thinking' },
  };
  const topicMap = clusterTopics[subject] || {};
  const difficulty = questions[0]?.difficulty || 'MEDIUM';
  return questions.map(q => {
    const cluster = topicMap[q.topic] || 'General';
    return {
      question: q.question,
      options: q.options,
      correct_answer: q.answer,
      points: 1,
      question_type: 'multiple_choice',
      subject: subject,
      difficulty_level: q.difficulty || 'MEDIUM',
      topic: q.topic,
      subtopic: cluster,
      explanation: '',
      skill_tag: subject === 'MATHEMATICS' ? 'Numerical' : subject === 'ENGLISH' ? 'Verbal' : 'Scientific Reasoning',
      bloom_level: (q.difficulty === 'EASY' ? 'Remember' : q.difficulty === 'MEDIUM' ? 'Understand' : 'Analyze'),
      curriculum: 'Both',
      grade_level: 'JSS3',
    };
  });
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database\n');

  // 1. Create the mock exam
  const examResult = await client.query(
    `INSERT INTO mock_exams (title, description, exam_type, academic_year, duration_minutes, passing_score, total_questions, shuffle_questions, max_attempts, is_published, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, title`,
    [
      'JSS3 BECE Mock Examination',
      'Comprehensive diagnostic assessment covering Mathematics, English, Basic Science, and Basic Technology. Designed to assess readiness for the BECE and recommend Senior Secondary pathways.',
      'JSS3_BECE',
      new Date().getFullYear().toString(),
      180, 50, 220,
      true, 0, true, true
    ]
  );
  const exam = examResult.rows[0];
  console.log(`Created exam: ${exam.title} (ID: ${exam.id})\n`);

  // 2. Build all questions
  const allQuestions = [
    ...buildQuestions('MATHEMATICS', mathQuestions),
    ...buildQuestions('BASIC SCIENCE', basicScienceQuestions),
    ...buildQuestions('BASIC TECHNOLOGY', basicTechQuestions),
    ...buildQuestions('ENGLISH', englishPart1Questions),
    ...buildQuestions('ENGLISH', englishPart2Questions),
    ...buildQuestions('ENGLISH', englishPart3Questions),
    ...buildQuestions('ENGLISH', englishPart4Questions),
  ];

  console.log(`Total questions to insert: ${allQuestions.length}`);

  const bySubject = {};
  allQuestions.forEach(q => {
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
  });
  Object.entries(bySubject).forEach(([subj, count]) => {
    console.log(`  ${subj}: ${count} questions`);
  });
  console.log('');

  // 3. Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < allQuestions.length; i += batchSize) {
    const batch = allQuestions.slice(i, i + batchSize);
    const values = [];
    const params = [];
    let paramIdx = 1;
    for (const q of batch) {
      values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
      params.push(
        exam.id, q.question, null, q.options, null,
        q.correct_answer, q.points, q.question_type, q.subject,
        q.difficulty_level, q.topic, q.subtopic, q.explanation,
        q.skill_tag, q.bloom_level, q.curriculum, q.grade_level
      );
    }
    const sql = `INSERT INTO mock_questions (exam_id, question, question_image, options, option_images, correct_answer, points, question_type, subject, difficulty_level, topic, subtopic, explanation, skill_tag, bloom_level, curriculum, grade_level) VALUES ${values.join(', ')}`;
    await client.query(sql, params);
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} questions)`);
  }

  console.log('\nSeed complete!');
  console.log(`Exam ID: ${exam.id}`);
  console.log(`Total questions: ${allQuestions.length}`);

  await client.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
