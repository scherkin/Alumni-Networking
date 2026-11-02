"""Generate supabase/seed.sql: 5,000 MADE-UP alumni and a set of made-up internships.

Everything here is fictional. Emails use example.com (reserved, never delivered) and phone numbers use
555-0100..555-0199 (reserved for fiction). Every row is flagged is_sample so it can be removed in one statement.

Run:  python3 scripts/generate_seed.py
"""
import random
import re
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

random.seed(2026)
TOTAL = 5000
CURRENT_YEAR = 2026
OUT = Path(__file__).resolve().parent.parent / "supabase" / "seed.sql"

FIRST = """James Maria Wei Aisha Daniel Priya Carlos Emily Kwame Sofia Ethan Hana Marcus Leila Noah Grace Mateo Olivia Raj
Chloe Jamal Isabel Lucas Yuki Andre Fatima Ryan Mei Diego Nadia Owen Zara Samuel Elena Tyler Amara Kevin Rosa Jordan Ingrid
Malik Hannah Victor Lena Brandon Anika Gabriel Tessa Omar Julia Patrick Imani Henry Camila Derek Naomi Luis Avery Tomas Keisha
Ava Liam Mia Elijah Harper Benjamin Aaliyah Sebastian Nora Isaac Layla Caleb Zoe Adrian Ruby Julian Stella Miles Alice Felix
Iris Theo Ana Hugo Clara Dante Esme Ravi Lucia Kofi Sana Arjun Maya Tariq Freya Emeka Ines Jonah Talia Kenji Rhea Nikolai Bianca
Robert Linda Susan Gary Deborah Frank Carol Dennis Janet Walter Ruth Harold Joyce Ray Gloria Paul Karen Mark Sharon Steven""".split()
LAST = """Okafor Nguyen Patel Ramirez Thompson Kim Hernandez Walsh Chen Johnson Abara Lindqvist Morales Brooks Haddad Sullivan
Tanaka Reyes Washington Kowalski Singh Foster Delgado Murphy Osei Bennett Cruz Fischer Greene Nakamura Price Alvarez Hughes Mensah
Ortiz Carter Rossi Bailey Shah Dubois Coleman Park Medina Russo Ward Ibrahim Flores Jensen Dawson Castillo Hayes Moreau Banks Volkov
Pham Gallagher Torres Reid Yilmaz Sato Adeyemi Bauer Campbell Diaz Edwards Ferreira Gupta Hoffman Ivanova Jackson Khan Lopez Mitchell
Novak Olsen Petrov Quinn Rahman Silva Turner Usman Vargas Weber Xu Young Zhang Andersson Bianchi Choi Dlamini Esposito Fontaine
Grant Holm Iyer Jovanovic Kaur Larsen Mahmoud Nunez Obi Popescu Romero Schmidt Tran Varga Wright Yamamoto Zielinski Kapoor Lee
Morgan Nash Owusu Pereira""".split()
CITIES = ["Columbus, OH", "Austin, TX", "Denver, CO", "Atlanta, GA", "Chicago, IL", "Seattle, WA", "Phoenix, AZ", "Boston, MA",
          "Charlotte, NC", "Minneapolis, MN", "Raleigh, NC", "Pittsburgh, PA", "Nashville, TN", "San Diego, CA", "Kansas City, MO",
          "New York, NY", "Los Angeles, CA", "Washington, DC", "Philadelphia, PA", "Detroit, MI", "Portland, OR", "Miami, FL",
          "Remote", "Hometown"]
AREA_CODES = """201 202 203 205 206 207 208 212 213 214 215 216 217 218 219 224 225 228 229 231 234 239 240 248 251 252 253 254
256 260 262 267 269 270 276 281 301 302 303 304 305 307 308 309 310 312 313 314 315 316 317 318 319 320 321 323 330 334 336 337
339 347 351 352 360 361 386 401 402 404 405 406 407 408 409 410 412 413 414 415 417 419 423 424 425 432 434 435 440""".split()
OPEN_TO = ["Mentoring", "Informational interviews", "Job shadowing", "Internships", "Résumé review", "College advice"]

# Each role: (title, specialty, description, employers, is_student, min_age, max_age)
ROLES = {
"Healthcare & Medicine": ([
 ("Pre-med student", "Biology", "Studying biology and volunteering in an emergency department while preparing for the MCAT.", ["State University"], 1, 19, 23),
 ("Nursing student", "Nursing", "Finishing a nursing degree with clinical rotations in pediatrics and surgery.", ["Lakeview College of Nursing"], 1, 19, 23),
 ("Registered Nurse", "Emergency nursing", "Triages and treats patients in a busy emergency department.", ["Riverbend Regional Medical Center", "Northside Community Hospital"], 0, 23, 62),
 ("Physician Assistant", "Orthopedics", "Examines patients, orders imaging and assists in surgery at an orthopedic practice.", ["Summit Orthopedic Partners"], 0, 26, 62),
 ("Medical Resident", "Internal medicine", "In residency training, rotating through hospital wards and clinics.", ["University Hospital"], 0, 26, 33),
 ("Family Physician", "Family medicine", "Sees patients of all ages for checkups, chronic conditions and everyday illnesses.", ["Maple Street Family Health", "Valley Primary Care"], 0, 31, 66),
 ("Surgeon", "General surgery", "Performs abdominal and emergency surgeries and teaches surgical residents.", ["University Hospital"], 0, 34, 66),
 ("Pharmacist", "Pharmacy", "Reviews prescriptions for safety and counsels patients on their medications.", ["Cornerstone Pharmacy"], 0, 25, 66),
 ("Physical Therapist", "Sports rehab", "Helps athletes and post-surgery patients regain strength and movement.", ["Momentum Physical Therapy"], 0, 25, 62),
 ("Paramedic", "Emergency medical services", "Responds to 911 calls and gives emergency care on the way to the hospital.", ["County EMS"], 0, 21, 55),
 ("Hospital Administrator", "Healthcare management", "Oversees budgets, staffing and operations for several hospital departments.", ["Riverbend Regional Medical Center"], 0, 35, 66),
 ("Public Health Analyst", "Epidemiology", "Tracks disease trends and helps design community health programs.", ["County Department of Public Health"], 0, 24, 62),
], "Lakeview College of Nursing|State University|Midwest Medical School|Ohio Valley University"),
"Engineering": ([
 ("Engineering student", "Mechanical engineering", "Studying mechanical engineering and competing on a student racing team.", ["State Tech University"], 1, 19, 23),
 ("Engineering co-op student", "Electrical engineering", "Alternating semesters of classes with paid work at a power utility.", ["State Tech University"], 1, 19, 23),
 ("Mechanical Engineer", "Product design", "Designs and tests mechanical parts in CAD and builds prototypes.", ["Apex Manufacturing", "Northwind Robotics"], 0, 22, 62),
 ("Civil Engineer", "Transportation", "Designs roads and bridges and inspects construction for safety and quality.", ["Keystone Civil Group", "State Department of Transportation"], 0, 22, 62),
 ("Electrical Engineer", "Power systems", "Designs electrical systems for substations and the power grid.", ["Midstate Power & Light"], 0, 22, 62),
 ("Software Engineer", "Backend systems", "Builds the servers and databases behind a mobile app.", ["Brightloop Software", "Cobalt Labs"], 0, 21, 55),
 ("Aerospace Engineer", "Propulsion", "Analyzes and tests rocket engine components.", ["Horizon Aerospace"], 0, 23, 62),
 ("Biomedical Engineer", "Medical devices", "Develops and tests devices like insulin pumps and heart monitors.", ["Meridian Medical Devices"], 0, 23, 60),
 ("Environmental Engineer", "Water treatment", "Designs systems that clean drinking water and wastewater.", ["BlueRiver Environmental"], 0, 23, 62),
 ("Engineering Manager", "Manufacturing", "Leads a team of engineers improving production lines.", ["Apex Manufacturing"], 0, 33, 66),
 ("Professional Engineer (PE), Firm Owner", "Civil consulting", "Founded and runs a small civil engineering firm serving local towns.", ["Hometown Engineering LLC"], 0, 40, 66),
], "State Tech University|Great Lakes Polytechnic|Riverside University"),
"Business": ([
 ("Business student", "Management", "Studying business administration and running a campus coffee cart with classmates.", ["State University School of Business"], 1, 19, 23),
 ("Marketing Coordinator", "Digital marketing", "Plans email and social campaigns and tracks how they perform.", ["Pinnacle Foods Corp.", "Brightloop Software"], 0, 21, 40),
 ("Sales Representative", "B2B sales", "Finds new business customers and manages a territory of accounts.", ["Lakeshore Industries", "Summit Supply Co."], 0, 21, 55),
 ("Management Consultant", "Strategy", "Helps companies solve problems like entering new markets or cutting costs.", ["Northgate Advisory"], 0, 23, 55),
 ("Operations Analyst", "Supply chain", "Uses data to make warehouses and deliveries run faster and cheaper.", ["Summit Supply Co."], 0, 22, 50),
 ("Human Resources Specialist", "Recruiting", "Hires new employees and helps staff with benefits and workplace questions.", ["Lakeshore Industries"], 0, 23, 60),
 ("Product Manager", "Consumer apps", "Decides what features to build next and works with designers and engineers.", ["Cobalt Labs"], 0, 25, 55),
 ("Marketing Manager", "Brand", "Leads a team that shapes how customers see a brand.", ["Pinnacle Foods Corp."], 0, 30, 62),
 ("Small Business Owner", "Retail", "Owns and runs a neighborhood shop with eight employees.", ["Main Street Outfitters", "Corner Bloom Florist"], 0, 28, 66),
 ("Vice President of Operations", "Operations", "Oversees manufacturing, shipping and customer service for a mid-size company.", ["Lakeshore Industries"], 0, 40, 66),
 ("Chief Executive Officer (CEO)", "Leadership", "Leads a regional company and reports to its board of directors.", ["Summit Supply Co."], 0, 42, 66),
], "State University School of Business|Northshore College|Riverside University"),
"Finance": ([
 ("Finance student", "Finance", "Studying finance and managing a portfolio with the student investment club.", ["State University School of Business"], 1, 19, 23),
 ("Accounting student", "Accounting", "Studying accounting and interning during tax season.", ["State University School of Business"], 1, 19, 23),
 ("Financial Analyst", "Corporate finance", "Builds budgets and forecasts and explains the numbers to company leaders.", ["Lakeshore Industries", "Pinnacle Foods Corp."], 0, 22, 50),
 ("Staff Accountant", "Accounting", "Prepares financial statements and reconciles accounts each month.", ["Harbor & Lane CPAs"], 0, 22, 40),
 ("Certified Public Accountant (CPA)", "Tax", "Prepares tax returns and advises small businesses on tax planning.", ["Harbor & Lane CPAs"], 0, 25, 66),
 ("Investment Banking Analyst", "Mergers & acquisitions", "Analyzes companies and prepares materials for mergers and acquisitions.", ["Granite Peak Capital"], 0, 22, 30),
 ("Financial Advisor", "Wealth management", "Helps families plan for retirement, college savings and investments.", ["Evergreen Wealth Partners"], 0, 25, 66),
 ("Loan Officer", "Mortgage lending", "Guides home buyers through mortgage applications and approvals.", ["Hometown Community Bank"], 0, 23, 62),
 ("Actuary", "Insurance", "Uses statistics to price insurance and measure risk.", ["Shieldline Insurance"], 0, 24, 62),
 ("Portfolio Manager", "Equities", "Picks stocks and manages investment funds for clients.", ["Granite Peak Capital"], 0, 32, 66),
 ("Bank Branch Manager", "Retail banking", "Manages a bank branch's staff, customers and lending goals.", ["Hometown Community Bank"], 0, 30, 62),
 ("Chief Financial Officer (CFO)", "Corporate leadership", "Leads finance, accounting and strategy for a mid-size company.", ["Lakeshore Industries"], 0, 40, 66),
], "State University School of Business|Northshore College|Riverside University"),
"Journalism": ([
 ("Journalism student", "Reporting", "Studying journalism and editing the campus newspaper.", ["Metro School of Journalism"], 1, 19, 23),
 ("Staff Reporter", "Local news", "Covers city government, schools and breaking news for a daily paper.", ["The Valley Ledger", "Metro Daily Tribune"], 0, 22, 55),
 ("Copy Editor", "Editing", "Checks stories for accuracy, style and clarity before they publish.", ["Metro Daily Tribune"], 0, 23, 62),
 ("Investigative Reporter", "Investigations", "Spends months digging through records to uncover stories in the public interest.", ["Statewide Public Radio", "The Valley Ledger"], 0, 26, 62),
 ("Photojournalist", "Photography", "Photographs news events, sports and community life.", ["Riverside Gazette"], 0, 22, 62),
 ("Data Journalist", "Data reporting", "Finds stories in public data and builds charts and maps to explain them.", ["Metro Daily Tribune"], 0, 23, 50),
 ("Sports Writer", "Sports", "Covers high school, college and professional teams.", ["Riverside Gazette"], 0, 22, 60),
 ("Fact-Checker", "Verification", "Verifies names, numbers and quotes in magazine stories.", ["Northlight Magazine"], 0, 22, 45),
 ("Washington Correspondent", "Politics", "Reports on Congress and national politics from the capital.", ["Statewide Public Radio"], 0, 30, 62),
 ("Managing Editor", "Newsroom leadership", "Runs the daily news meeting and decides which stories lead.", ["The Valley Ledger"], 0, 35, 66),
 ("Editor-in-Chief", "Publishing", "Sets the direction of a regional news organization and leads its newsroom.", ["Metro Daily Tribune"], 0, 42, 66),
], "Metro School of Journalism|State University|Northshore College"),
"Law": ([
 ("Pre-law student", "Political science", "Studying political science and competing on the mock trial team.", ["State University"], 1, 19, 23),
 ("Paralegal", "Litigation support", "Prepares documents, organizes evidence and helps attorneys get ready for trial.", ["Harbor & Lane LLP", "Whitfield Kerr LLP"], 0, 21, 62),
 ("Law Clerk", "Courts", "Researches cases and drafts opinions for a judge.", ["Superior Court of the County"], 0, 25, 32),
 ("Associate Attorney", "Corporate law", "Drafts contracts and advises businesses at a law firm.", ["Whitfield Kerr LLP"], 0, 25, 40),
 ("Public Defender", "Criminal defense", "Represents people charged with crimes who can't afford a lawyer.", ["County Public Defender's Office"], 0, 26, 64),
 ("Assistant District Attorney", "Prosecution", "Prosecutes criminal cases on behalf of the county.", ["Office of the District Attorney"], 0, 26, 60),
 ("Immigration Attorney", "Immigration", "Helps families and workers through visa and citizenship cases.", ["Meridian Legal Aid"], 0, 27, 64),
 ("Corporate Counsel", "In-house legal", "Handles contracts, compliance and legal risk inside a company.", ["Lakeshore Industries"], 0, 30, 64),
 ("Compliance Officer", "Regulation", "Makes sure a bank follows financial laws and regulations.", ["Hometown Community Bank"], 0, 26, 62),
 ("Partner", "Litigation", "Co-owns a law firm and leads its biggest trial cases.", ["Harbor & Lane LLP"], 0, 38, 66),
 ("Judge", "Superior court", "Presides over civil and criminal trials in county court.", ["Superior Court of the County"], 0, 45, 66),
], "Midwest Law School|State University|Riverside University"),
"Media & Communications": ([
 ("Communications student", "Media studies", "Studying media and producing a weekly show for the campus radio station.", ["State University"], 1, 19, 23),
 ("Social Media Coordinator", "Social media", "Plans and posts content for a brand's social accounts and answers followers.", ["Brightwave Media", "Clearline PR"], 0, 21, 35),
 ("Production Assistant", "Television", "Helps run shoots, sets up equipment and keeps productions on schedule.", ["Northlight Studios"], 0, 21, 32),
 ("Video Editor", "Post-production", "Cuts footage into finished videos, ads and short documentaries.", ["Northlight Studios"], 0, 22, 55),
 ("Public Relations Specialist", "PR", "Writes press releases and pitches stories about clients to reporters.", ["Clearline PR"], 0, 22, 55),
 ("Content Strategist", "Content", "Plans what a company publishes across its website, newsletter and videos.", ["Brightwave Media"], 0, 24, 55),
 ("Television Producer", "News production", "Plans segments, books guests and runs the control room for a newscast.", ["Channel 8 News"], 0, 26, 62),
 ("News Anchor", "Broadcast", "Presents the evening news and interviews guests live on air.", ["Channel 8 News"], 0, 28, 64),
 ("Documentary Filmmaker", "Film", "Researches, shoots and edits documentaries for streaming and festivals.", ["Freelance"], 0, 25, 66),
 ("Communications Director", "Corporate communications", "Leads a team that shapes a company's message to the public and employees.", ["Pinnacle Foods Corp."], 0, 34, 66),
 ("Founder, Media Agency", "Agency", "Started and runs a small agency that makes videos and campaigns for nonprofits.", ["Brightwave Media"], 0, 32, 66),
], "State University|Northshore College|Metro School of Journalism"),
"Architecture": ([
 ("Architecture student", "Design studio", "Studying architecture and building models for design studio reviews.", ["Riverside University School of Architecture"], 1, 19, 24),
 ("Architectural Designer", "Residential", "Draws plans and 3D models for homes and small buildings.", ["Lumen Design Studio", "Stonebridge Architects"], 0, 22, 35),
 ("Junior Architect", "Commercial", "Works on drawings and details for office and retail buildings.", ["Stonebridge Architects"], 0, 24, 32),
 ("Architect", "Schools and libraries", "Designs public buildings and works with builders until they open.", ["Stonebridge Architects", "Atlas Urban Collaborative"], 0, 28, 64),
 ("Landscape Architect", "Parks", "Designs parks, plazas and green spaces.", ["Atlas Urban Collaborative"], 0, 26, 64),
 ("Urban Planner", "Housing", "Plans how neighborhoods grow, from zoning to bike lanes.", ["City Planning Department"], 0, 24, 62),
 ("Interior Designer", "Commercial interiors", "Designs the inside of offices, restaurants and hotels.", ["Lumen Design Studio"], 0, 22, 62),
 ("BIM Specialist", "Building modeling", "Builds detailed digital models that coordinate every part of a building.", ["Stonebridge Architects"], 0, 23, 50),
 ("Construction Project Manager", "Construction", "Keeps building projects on schedule and on budget.", ["Summit Builders"], 0, 30, 64),
 ("Principal Architect", "Firm leadership", "Leads design for a firm's largest projects and mentors its architects.", ["Stonebridge Architects"], 0, 40, 66),
 ("Founding Partner", "Architecture firm", "Co-founded and runs a 20-person architecture firm.", ["Lumen Design Studio"], 0, 40, 66),
], "Riverside University School of Architecture|Great Lakes Polytechnic|State University"),
"Performing Arts": ([
 ("Theater student", "Acting", "Studying acting and performing in four productions a year.", ["Conservatory of the Arts"], 1, 19, 23),
 ("Music student", "Performance", "Studying violin performance and playing in the conservatory orchestra.", ["Conservatory of the Arts"], 1, 19, 23),
 ("Actor", "Stage and screen", "Performs in regional theater and auditions for TV and commercials.", ["Valley Repertory Theatre", "Freelance"], 0, 20, 66),
 ("Professional Dancer", "Contemporary dance", "Dances with a touring company and teaches master classes.", ["Riverside Dance Company"], 0, 19, 40),
 ("Orchestra Musician", "Cello", "Plays cello in a professional symphony orchestra.", ["Metro Symphony Orchestra"], 0, 22, 66),
 ("Session Musician", "Guitar", "Records guitar for albums, ads and film scores.", ["Freelance"], 0, 21, 66),
 ("Stage Manager", "Theater production", "Runs rehearsals and calls every cue during performances.", ["Valley Repertory Theatre"], 0, 23, 62),
 ("Choreographer", "Dance", "Creates dances for theater productions and music videos.", ["Riverside Dance Company"], 0, 25, 66),
 ("Lighting Designer", "Lighting", "Designs the lighting for plays, concerts and dance shows.", ["Valley Repertory Theatre"], 0, 23, 64),
 ("Opera Singer", "Soprano", "Sings leading roles with opera companies across the region.", ["Lakeside Opera"], 0, 24, 60),
 ("Artistic Director", "Theater leadership", "Chooses each season's shows and leads a nonprofit theater.", ["Valley Repertory Theatre"], 0, 38, 66),
], "Conservatory of the Arts|State University|Northshore College"),
"Hospitality": ([
 ("Hospitality student", "Hotel management", "Studying hospitality management and working weekends at a resort.", ["Hospitality Institute"], 1, 19, 23),
 ("Culinary student", "Culinary arts", "Training as a chef in a culinary program's teaching kitchen.", ["Culinary Arts Academy"], 1, 19, 23),
 ("Front Desk Agent", "Guest services", "Checks guests in and out and solves problems during their stay.", ["The Grand Harbor Hotel"], 0, 19, 35),
 ("Line Cook", "Kitchen", "Cooks dishes on the grill station during busy dinner service.", ["Copper Kettle Restaurant Group"], 0, 19, 35),
 ("Sous Chef", "Kitchen", "Runs the kitchen line and trains cooks under the head chef.", ["Copper Kettle Restaurant Group"], 0, 24, 50),
 ("Event Planner", "Weddings and conferences", "Plans weddings and conferences from the first call to the last guest.", ["Evergreen Events"], 0, 22, 62),
 ("Sommelier", "Wine", "Builds the wine list and helps diners choose pairings.", ["Lakeview Resort & Spa"], 0, 24, 62),
 ("Concierge", "Guest services", "Books tours, tables and transport for hotel guests.", ["The Grand Harbor Hotel"], 0, 22, 62),
 ("Revenue Manager", "Pricing", "Sets room prices each day based on demand and events in town.", ["Lakeview Resort & Spa"], 0, 27, 60),
 ("Executive Chef", "Restaurant kitchen", "Creates the menu and leads the kitchen team of a busy restaurant.", ["Copper Kettle Restaurant Group"], 0, 30, 66),
 ("Hotel General Manager", "Hotel operations", "Runs every part of a 300-room hotel, from staffing to guest reviews.", ["The Grand Harbor Hotel"], 0, 35, 66),
 ("Restaurant Owner", "Restaurants", "Owns two neighborhood restaurants and manages 40 staff.", ["Copper Kettle Restaurant Group"], 0, 32, 66),
], "Hospitality Institute|Culinary Arts Academy|State University"),
"Politics & Government": ([
 ("Political science student", "Political science", "Studying political science and volunteering on local campaigns.", ["State University"], 1, 19, 23),
 ("Legislative Aide", "State legislature", "Researches bills and answers constituent questions for a state lawmaker.", ["State Legislature"], 0, 21, 32),
 ("Field Organizer", "Campaigns", "Recruits volunteers and runs door-knocking for political campaigns.", ["Campaign for Measure 12", "Civic Futures Institute"], 0, 21, 35),
 ("Policy Analyst", "Education policy", "Studies how laws affect schools and writes reports for lawmakers.", ["Civic Futures Institute"], 0, 23, 62),
 ("Lobbyist", "Healthcare policy", "Represents hospitals in conversations with lawmakers about new bills.", ["Capitol Strategies Group"], 0, 28, 64),
 ("Foreign Service Officer", "Diplomacy", "Represents the country at embassies abroad, helping citizens and building ties.", ["Foreign Service"], 0, 26, 64),
 ("Campaign Manager", "Elections", "Runs the strategy, budget and staff of a political campaign.", ["Campaign for Measure 12"], 0, 28, 60),
 ("City Council Member", "Local government", "Votes on the city budget and local laws and holds neighborhood meetings.", ["City Council"], 0, 30, 66),
 ("Chief of Staff", "Government leadership", "Runs the office and staff of a state senator.", ["State Legislature"], 0, 32, 64),
 ("State Senator", "State government", "Represents a district in the state senate and writes legislation.", ["State Legislature"], 0, 38, 66),
 ("Mayor", "City government", "Leads city government, the budget and city departments.", ["City Hall"], 0, 40, 66),
], "State University|Riverside University|Northshore College"),
}

SENIOR_ELIGIBLE = re.compile(r"(Nurse|Engineer|Analyst|Accountant|Reporter|Editor|Writer|Designer|Planner|Consultant|"
                             r"Specialist|Strategist|Photojournalist|Journalist|Therapist|Pharmacist|Paramedic|Advisor|"
                             r"Representative|Paralegal|Loan Officer|Auditor|Cook|Musician|Officer)$")


def build_people():
    fields = list(ROLES)
    per_field = [TOTAL // len(fields) + (1 if i < TOTAL % len(fields) else 0) for i in range(len(fields))]
    used_phones, used_emails, people = set(), set(), []
    for field, count in zip(fields, per_field):
        roles, colleges = ROLES[field]
        colleges = colleges.split("|")
        ages = [19 + round(i * (66 - 19) / (count - 1)) for i in range(count)]  # every age 19..66, evenly
        random.shuffle(ages)
        for age in ages:
            title, spec, desc, orgs, is_student, *_ = random.choice([r for r in roles if r[5] <= age <= r[6]])
            if age >= 38 and not is_student and SENIOR_ELIGIBLE.search(title):
                title = f"Senior {title}"
            first = random.choice(FIRST if age >= 45 else FIRST[:115])
            last = random.choice(LAST)
            base = re.sub(r"[^a-z.]", "", f"{first}.{last}".lower())
            email, n = f"{base}@example.com", 2
            while email in used_emails:
                email, n = f"{base}{n}@example.com", n + 1
            used_emails.add(email)
            while True:
                phone = f"({random.choice(AREA_CODES)}) 555-01{random.randint(0, 99):02d}"
                if phone not in used_phones:
                    used_phones.add(phone)
                    break
            people.append({
                "name": f"{first} {last}", "class_year": CURRENT_YEAR - age + 18, "field": field, "specialty": spec,
                "title": title, "organization": random.choice(orgs), "city": random.choice(CITIES),
                "college": orgs[0] if is_student else random.choice(colleges), "email": email, "phone": phone,
                "preferred": random.choice(["Email first", "Text is fine", "Email, weekday evenings", "Phone or email"]),
                "bio": desc, "open_to": [],
            })
    random.shuffle(people)
    for i, p in enumerate(people, 1):  # only 1 in every 25 lists what they'll help with
        if i % 25 == 0:
            p["open_to"] = random.sample(OPEN_TO, random.randint(1, 3))
    return people


# (field, company, title, description, spots, grades, gpa, experience, paid, pay, location)
INTERNSHIPS = [
 ("Healthcare & Medicine", "Riverbend Regional Medical Center", "Summer Patient Care Volunteer Intern", "Shadow nurses on a medical-surgical unit, help patients with meals and mobility, and join weekly talks with doctors about their careers.", 8, ["11th grade", "12th grade"], 3.0, "CPR certification preferred. Must be 16 or older.", False, None, "Columbus, OH"),
 ("Healthcare & Medicine", "Momentum Physical Therapy", "Physical Therapy Aide Intern", "Set up exercise equipment, track patient progress charts, and observe therapists working with athletes recovering from injuries.", 2, ["12th grade", "Recent graduates"], None, "Interest in sports medicine. Comfortable talking with patients.", True, "$15/hour", "Austin, TX"),
 ("Healthcare & Medicine", "County Department of Public Health", "Community Health Research Intern", "Help survey neighborhoods about health needs and turn the results into charts for a public report.", 3, ["11th grade", "12th grade", "Recent graduates"], 3.2, "Comfortable with spreadsheets. Spanish a plus.", True, "$16/hour", "Hybrid"),
 ("Engineering", "Northwind Robotics", "Robotics Build Intern", "Assemble and test warehouse robots, document bugs, and present a small improvement project at the end of summer.", 4, ["11th grade", "12th grade"], 3.3, "Robotics club or shop class experience. Some coding helps.", True, "$17/hour", "Pittsburgh, PA"),
 ("Engineering", "Keystone Civil Group", "Civil Engineering Field Intern", "Visit bridge and road job sites with engineers, take measurements, and learn to read construction drawings.", 2, ["12th grade", "Recent graduates"], 3.0, "Geometry and physics coursework. Must have a driver's license.", True, "$18/hour", "Denver, CO"),
 ("Engineering", "BlueRiver Environmental", "Water Quality Lab Intern", "Collect river samples, run basic water tests in the lab, and log results for a city clean-water study.", 2, ["11th grade", "12th grade"], 3.0, "Chemistry or AP Environmental Science.", False, None, "Minneapolis, MN"),
 ("Business", "Main Street Outfitters", "Retail Marketing Intern", "Plan Instagram posts, design in-store displays, and help run a back-to-school sale for a local shop.", 1, ["10th grade", "11th grade", "12th grade"], None, "Creative and comfortable on social media.", True, "$14/hour", "Hometown"),
 ("Business", "Northgate Advisory", "Consulting Analyst Intern", "Research industries, build slides, and sit in on client meetings with a team of management consultants.", 3, ["12th grade", "Recent graduates"], 3.5, "Strong writing and Excel skills.", True, "$20/hour", "Chicago, IL"),
 ("Business", "Summit Supply Co.", "Operations & Logistics Intern", "Track shipments, map how orders move through the warehouse, and suggest ways to speed them up.", 2, ["11th grade", "12th grade", "Recent graduates"], 3.0, "Organized and good with numbers.", True, "$16/hour", "Charlotte, NC"),
 ("Finance", "Hometown Community Bank", "Banking Operations Intern", "Learn how a community bank works by rotating through tellers, lending and customer service.", 2, ["11th grade", "12th grade"], 3.0, "Interest in finance. Professional dress required.", True, "$15/hour", "Hometown"),
 ("Finance", "Evergreen Wealth Partners", "Financial Planning Intern", "Help advisors prepare client meetings, research investments, and build simple retirement projections.", 1, ["12th grade", "Recent graduates"], 3.4, "Took economics or personal finance. Excel basics.", True, "$17/hour", "Boston, MA"),
 ("Finance", "Harbor & Lane CPAs", "Tax Season Intern", "Organize client documents and enter data for tax returns during the busiest months of the year.", 4, ["12th grade", "Recent graduates"], 3.2, "Accounting class preferred. Detail-oriented.", True, "$16/hour", "Raleigh, NC"),
 ("Journalism", "The Valley Ledger", "Summer Reporting Intern", "Report and write local news stories that run in print and online, with an editor coaching every draft.", 2, ["11th grade", "12th grade", "Recent graduates"], None, "Two writing samples, such as school newspaper articles.", True, "$15/hour", "Hometown"),
 ("Journalism", "Statewide Public Radio", "Podcast Production Intern", "Book guests, record interviews, and edit audio for a weekly news podcast.", 1, ["12th grade", "Recent graduates"], None, "Any audio or video editing experience.", True, "$16/hour", "Remote"),
 ("Journalism", "Riverside Gazette", "Sports Photography Intern", "Shoot high school games and community events and caption photos for publication.", 2, ["10th grade", "11th grade", "12th grade"], None, "Bring your own camera if possible. Portfolio of 10 photos.", False, None, "Hometown"),
 ("Law", "Meridian Legal Aid", "Legal Aid Office Intern", "Greet clients, organize case files, and help attorneys prepare for immigration and housing hearings.", 3, ["11th grade", "12th grade", "Recent graduates"], 3.0, "Bilingual Spanish or Vietnamese strongly preferred.", False, None, "San Diego, CA"),
 ("Law", "Whitfield Kerr LLP", "Law Firm Summer Intern", "Assist paralegals with document review, attend a court hearing, and research a legal question for a final memo.", 2, ["12th grade", "Recent graduates"], 3.6, "Debate or mock trial experience preferred.", True, "$18/hour", "Philadelphia, PA"),
 ("Law", "Office of the District Attorney", "Victim Services Intern", "Support staff who guide crime victims through the court process and help prepare case summaries.", 2, ["12th grade", "Recent graduates"], 3.0, "Must pass a background check.", False, None, "Detroit, MI"),
 ("Media & Communications", "Northlight Studios", "Video Production Intern", "Work on real commercial shoots: set up lights, log footage, and edit a short behind-the-scenes video.", 3, ["11th grade", "12th grade", "Recent graduates"], None, "Any video editing software. Share a link to your work.", True, "$16/hour", "Los Angeles, CA"),
 ("Media & Communications", "Clearline PR", "Public Relations Intern", "Draft social posts and press releases, track news coverage, and help plan a product launch event.", 2, ["12th grade", "Recent graduates"], 3.0, "Strong writing. Comfortable on the phone.", True, "$15/hour", "Hybrid"),
 ("Media & Communications", "Channel 8 News", "Newsroom Intern", "Help producers research stories, write web copy, and watch the evening newscast come together live.", 2, ["11th grade", "12th grade"], 3.2, "Interest in TV news. Evening availability.", False, None, "Atlanta, GA"),
 ("Architecture", "Stonebridge Architects", "Architecture Studio Intern", "Build physical models, help with drawings in CAD, and join design reviews for a new library.", 2, ["11th grade", "12th grade", "Recent graduates"], 3.0, "Drafting or art classes. Portfolio of sketches welcome.", True, "$16/hour", "Seattle, WA"),
 ("Architecture", "City Planning Department", "Urban Planning Intern", "Count bike and foot traffic, make maps, and help prepare a neighborhood plan for public meetings.", 2, ["11th grade", "12th grade"], None, "Curious about how cities work.", True, "$15/hour", "Portland, OR"),
 ("Architecture", "Lumen Design Studio", "Interior Design Intern", "Organize the materials library, pull samples for clients, and draft furniture layouts.", 1, ["12th grade", "Recent graduates"], None, "Eye for design. SketchUp a plus.", False, None, "Nashville, TN"),
 ("Performing Arts", "Valley Repertory Theatre", "Stage Crew & Production Intern", "Build sets, run backstage during performances, and learn lighting and sound from the production team.", 6, ["10th grade", "11th grade", "12th grade"], None, "Theater tech experience helpful. Evenings and weekends.", True, "$250/week stipend", "Hometown"),
 ("Performing Arts", "Metro Symphony Orchestra", "Arts Administration Intern", "Help the education team run youth concerts, manage ticket lists, and greet audiences on show nights.", 2, ["11th grade", "12th grade", "Recent graduates"], None, "Music background preferred.", False, None, "Chicago, IL"),
 ("Performing Arts", "Riverside Dance Company", "Dance Education Assistant", "Assist teaching artists in summer dance camps for kids ages 6 to 12.", 4, ["10th grade", "11th grade", "12th grade"], None, "At least three years of dance training.", True, "$13/hour", "Hometown"),
 ("Hospitality", "The Grand Harbor Hotel", "Hotel Operations Intern", "Rotate through the front desk, housekeeping and events teams to see how a large hotel runs.", 4, ["11th grade", "12th grade", "Recent graduates"], None, "Friendly and reliable. Weekend shifts.", True, "$15/hour", "Miami, FL"),
 ("Hospitality", "Copper Kettle Restaurant Group", "Culinary Kitchen Intern", "Prep ingredients, work a station during service, and create a dish for the staff meal under the chef's guidance.", 3, ["11th grade", "12th grade"], None, "Food handler card, or willing to get one.", True, "$14/hour", "Hometown"),
 ("Hospitality", "Evergreen Events", "Event Planning Intern", "Help plan and run weddings and conferences, from vendor calls to day-of setup.", 2, ["12th grade", "Recent graduates"], None, "Organized. Some weekend events.", False, None, "Kansas City, MO"),
 ("Politics & Government", "State Legislature", "Legislative Office Intern", "Answer constituent calls, track bills, and attend committee hearings at the state capitol.", 4, ["11th grade", "12th grade", "Recent graduates"], 3.3, "Government or civics class. Strong writing.", False, None, "State Capitol"),
 ("Politics & Government", "Civic Futures Institute", "Policy Research Intern", "Research how other states fund schools and help write a short policy brief.", 2, ["12th grade", "Recent graduates"], 3.5, "Research paper or debate experience.", True, "$16/hour", "Washington, DC"),
 ("Politics & Government", "City Council", "City Council Youth Fellow", "Join a council member's office for the summer, staff community meetings, and propose one youth initiative.", 2, ["10th grade", "11th grade", "12th grade"], 3.0, "Live in the city. Interest in public service.", True, "$1,500 stipend", "Hometown"),
]


def build_internships(people):
    today = date(CURRENT_YEAR, 11, 2)
    rows = []
    for i, (field, company, title, desc, spots, grades, gpa, exp, paid, pay, loc) in enumerate(INTERNSHIPS):
        posters = [p for p in people if p["field"] == field and CURRENT_YEAR - p["class_year"] + 18 >= 30 and p["organization"] == company] \
            or [p for p in people if p["field"] == field and CURRENT_YEAR - p["class_year"] + 18 >= 30]
        poster = random.choice(posters)
        closed = i % 11 == 10  # a few closed ones so the "Show closed" filter has something to show
        deadline = today - timedelta(days=random.randint(5, 40)) if closed else today + timedelta(days=random.randint(20, 200))
        slug = re.sub(r"[^a-z0-9]+", "-", f"{company} {title}".lower()).strip("-")
        rows.append({"field": field, "company": company, "title": title, "desc": desc, "spots": spots, "grades": grades,
                     "gpa": gpa, "exp": exp, "paid": paid, "pay": pay, "loc": loc, "deadline": deadline.isoformat(),
                     "url": f"https://example.org/apply/{slug}", "poster_email": poster["email"],
                     "created": (today - timedelta(days=random.randint(0, 30))).isoformat()})
    return rows


def q(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return ("array[" + ",".join(q(x) for x in v) + "]::text[]") if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def main():
    people = build_people()
    internships = build_internships(people)
    out = ["-- MADE-UP sample data for demos. Generated by scripts/generate_seed.py.",
           f"-- {len(people)} fictional alumni and {len(internships)} fictional internships.",
           "-- Emails use example.com and phones use 555-01xx, so nothing reaches a real person;",
           "-- the site never emails sample profiles. Remove before launch:",
           "--   delete from public.internships where is_sample;",
           "--   delete from public.alumni_profiles where is_sample;", ""]
    cols = "(name, class_year, field, specialty, title, organization, city, college, open_to, email, phone, preferred_contact, bio, consent, is_sample)"
    for start in range(0, len(people), 500):
        out.append(f"insert into public.alumni_profiles {cols} values")
        chunk = people[start:start + 500]
        out.append(",\n".join("(" + ",".join([q(p["name"]), q(p["class_year"]), q(p["field"]), q(p["specialty"]), q(p["title"]),
                   q(p["organization"]), q(p["city"]), q(p["college"]), q(p["open_to"]), q(p["email"]), q(p["phone"]),
                   q(p["preferred"]), q(p["bio"]), "true", "true"]) + ")" for p in chunk) + ";")
        out.append("")
    out.append("insert into public.internships (is_sample, sample_poster_id, company, role_title, description, signup_url, spots, "
               "grade_levels, min_gpa, experience, paid, pay_details, location, field, deadline, created_at) values")
    out.append(",\n".join("(true, (select id from public.alumni_profiles where email = " + q(r["poster_email"]) + "), " + ", ".join([
        q(r["company"]), q(r["title"]), q(r["desc"]), q(r["url"]), q(r["spots"]), q(r["grades"]), q(r["gpa"]), q(r["exp"]),
        q(r["paid"]), q(r["pay"]), q(r["loc"]), q(r["field"]), q(r["deadline"]) + "::date", q(r["created"]) + "::timestamptz"]) + ")"
        for r in internships) + ";")
    OUT.write_text("\n".join(out) + "\n")
    ages = [CURRENT_YEAR - p["class_year"] + 18 for p in people]
    print(f"{len(people)} people, {len(internships)} internships, ages {min(ages)}-{max(ages)}, "
          f"{sum(1 for p in people if p['open_to'])} with help options")
    for f, n in sorted(Counter(p["field"] for p in people).items()):
        print(f"  {n:4d}  {f}")


if __name__ == "__main__":
    main()
