"""
Seed demo data for LMS2 (Institute B): 20 users, courses, and realistic activity events.

Events are sent through the engagement tracker API with X-Institute-ID: LMS_INST_B,
so after running this the EduMind dashboard will show Institute B data.

Usage:
    cd C:\\Projects\\edumind\\LMS2
    venv\\Scripts\\activate
    python scripts/seed_demo_data.py
"""
import sys
import random
from pathlib import Path
from datetime import datetime, timedelta

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal, init_db
from app.models import User, Course, UserEdumindMapping

LMS_API = "http://localhost:8011/api"
ENGAGEMENT_API = "http://localhost:8005"
INSTITUTE_ID = "LMS_INST_B"

STUDENTS = [
    {"username": "student_b01", "display": "Nimal Bandara",     "edumind": "STU0006", "password": "password123"},
    {"username": "student_b02", "display": "Kamal Jayasinghe",  "edumind": "STU0007", "password": "password123"},
    {"username": "student_b03", "display": "Sithara Weerasinghe","edumind": "STU0008", "password": "password123"},
    {"username": "student_b04", "display": "Ruwan Dissanayake", "edumind": "STU0009", "password": "password123"},
    {"username": "student_b05", "display": "Tharushi Gamage",   "edumind": "STU0010", "password": "password123"},
    {"username": "student_b06", "display": "Sachini Herath",    "edumind": "STU0011", "password": "password123"},
    {"username": "student_b07", "display": "Lakshan Mendis",    "edumind": "STU0012", "password": "password123"},
    {"username": "student_b08", "display": "Dinusha Rathnayake","edumind": "STU0013", "password": "password123"},
    {"username": "student_b09", "display": "Amaya Wickrama",    "edumind": "STU0014", "password": "password123"},
    {"username": "student_b10", "display": "Pasan Seneviratne", "edumind": "STU0015", "password": "password123"},
    {"username": "student_b11", "display": "Hasini Abeykoon",   "edumind": "STU0016", "password": "password123"},
    {"username": "student_b12", "display": "Dilshan Cooray",    "edumind": "STU0017", "password": "password123"},
    {"username": "student_b13", "display": "Nadeesha Fonseka",  "edumind": "STU0018", "password": "password123"},
    {"username": "student_b14", "display": "Isuru Gunasekara",  "edumind": "STU0019", "password": "password123"},
    {"username": "student_b15", "display": "Kavinda Liyanage",  "edumind": "STU0020", "password": "password123"},
    {"username": "student_b16", "display": "Rashmi Nanayakkara","edumind": "STU0021", "password": "password123"},
    {"username": "student_b17", "display": "Thilina Pathirana", "edumind": "STU0022", "password": "password123"},
    {"username": "student_b18", "display": "Sewwandi Ranasinghe","edumind": "STU0023", "password": "password123"},
    {"username": "student_b19", "display": "Akila Samaraweera", "edumind": "STU0024", "password": "password123"},
    {"username": "student_b20", "display": "Uthpala Tennakoon", "edumind": "STU0025", "password": "password123"},
]

COURSES = [
    {"title": "Web Development Fundamentals", "description": "HTML, CSS, JavaScript and responsive design."},
    {"title": "Machine Learning Basics",      "description": "Supervised learning, regression, classification."},
    {"title": "Computer Networks",            "description": "TCP/IP, routing, switching, and network security."},
    {"title": "Software Engineering",         "description": "SDLC, agile, testing, and CI/CD pipelines."},
]

EVENT_TYPES = [
    "login", "page_view", "page_view", "page_view",
    "video_play", "video_complete",
    "quiz_start", "quiz_submit",
    "forum_post", "forum_reply",
    "assignment_submit", "resource_download", "content_interaction",
]


def simple_hash(password: str) -> str:
    return password + "_hashed"


def seed_users_and_courses():
    init_db()
    db = SessionLocal()
    try:
        for s in STUDENTS:
            user = db.query(User).filter(User.username == s["username"]).first()
            if not user:
                user = User(username=s["username"], password_hash=simple_hash(s["password"]), display_name=s["display"])
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"  Created user: {user.username} (id={user.id})")
            else:
                print(f"  User exists: {user.username} (id={user.id})")

            mapping = db.query(UserEdumindMapping).filter(UserEdumindMapping.lms_user_id == user.id).first()
            if not mapping:
                mapping = UserEdumindMapping(lms_user_id=user.id, edumind_student_id=s["edumind"])
                db.add(mapping)
                db.commit()
                print(f"    Mapped -> {s['edumind']}")

        for c in COURSES:
            course = db.query(Course).filter(Course.title == c["title"]).first()
            if not course:
                course = Course(title=c["title"], description=c["description"])
                db.add(course)
                db.commit()
                print(f"  Created course: {course.title}")
            else:
                print(f"  Course exists: {course.title}")
    finally:
        db.close()


def send_event_direct(student_id: str, event_type: str, ts: datetime, session_id: str):
    url = f"{ENGAGEMENT_API}/api/v1/events/ingest"
    payload = {
        "student_id": student_id,
        "event_type": event_type,
        "event_timestamp": ts.isoformat(),
        "session_id": session_id,
        "event_data": {"source": "seed_script"},
        "source_service": "minimal-lms-b",
    }
    headers = {"X-Institute-ID": INSTITUTE_ID}
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(url, json=payload, headers=headers)
        resp.raise_for_status()


def generate_events(days: int = 14):
    now = datetime.utcnow()
    total = 0

    for s in STUDENTS:
        sid = s["edumind"]
        activity_level = random.uniform(0.4, 1.0)

        for day_offset in range(days, 0, -1):
            day = now - timedelta(days=day_offset)
            if random.random() > activity_level + 0.2:
                continue

            session_id = f"sess-{sid}-{day.strftime('%Y%m%d')}"
            base_hour = random.randint(8, 20)
            events_today = random.randint(3, 15)

            ts = day.replace(hour=base_hour, minute=0, second=0, microsecond=0)
            try:
                send_event_direct(sid, "login", ts, session_id)
                total += 1
            except Exception as e:
                print(f"  WARN: failed sending login for {sid} on {day.date()}: {e}")
                continue

            for i in range(events_today - 1):
                ts = ts + timedelta(minutes=random.randint(1, 15))
                etype = random.choice(EVENT_TYPES)
                try:
                    send_event_direct(sid, etype, ts, session_id)
                    total += 1
                except Exception as e:
                    print(f"  WARN: event failed: {e}")

        print(f"  {sid} ({s['display']}): events sent")

    print(f"\nTotal events sent: {total}")


def trigger_aggregation():
    url = f"{ENGAGEMENT_API}/api/v1/aggregation/process-all?days=14&institute_id={INSTITUTE_ID}"
    print("\nTriggering aggregation backfill...")
    try:
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url)
            resp.raise_for_status()
            data = resp.json()
            print(f"  Processed: {data.get('processed', 0)}, Errors: {data.get('errors', 0)}")
    except Exception as e:
        print(f"  Aggregation call failed: {e}")
        print(f"  (You can run it manually later)")


def register_learning_style_profiles():
    """Create StudentLearningProfile records in the learning-style service for each student."""
    ls_api = "http://localhost:8006"
    styles = ["Visual", "Auditory", "Reading", "Kinesthetic"]
    print("\nRegistering student profiles in learning-style service...")
    for i, s in enumerate(STUDENTS):
        sid = s["edumind"]
        style = styles[i % len(styles)]
        payload = {
            "student_id": sid,
            "learning_style": style,
            "style_confidence": 0.5,
            "style_probabilities": {st: 0.25 for st in styles},
            "preferred_difficulty": "Medium",
            "preferred_resource_types": [],
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(f"{ls_api}/api/v1/students/", json=payload)
                if resp.status_code == 201:
                    print(f"  {sid}: profile created (initial style: {style})")
                elif resp.status_code == 400 and "already exists" in resp.text:
                    print(f"  {sid}: profile already exists")
                else:
                    print(f"  {sid}: unexpected response {resp.status_code}")
        except Exception as e:
            print(f"  {sid}: failed ({e})")


def trigger_learning_style_sync():
    ls_api = "http://localhost:8006"
    print("\nSyncing learning-style behavior data...")
    for s in STUDENTS:
        sid = s["edumind"]
        url = f"{ls_api}/api/v1/sync/from-engagement/{sid}?days=14"
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url)
                resp.raise_for_status()
                data = resp.json()
                print(f"  {sid}: {data.get('behaviour_rows_written', 0)} rows synced")
        except Exception as e:
            print(f"  {sid}: sync failed ({e})")


if __name__ == "__main__":
    print("=" * 60)
    print("  LMS2 (INSTITUTE B) DEMO DATA SEEDER")
    print("=" * 60)

    print("\n1. Seeding LMS2 users, courses, and mappings...")
    seed_users_and_courses()

    print("\n2. Generating activity events (14 days)...")
    print("   (Requires engagement-tracker running on :8005)")
    try:
        generate_events(days=14)
    except Exception as e:
        print(f"  Event generation failed: {e}")
        print("  Make sure the engagement-tracker service is running on port 8005.")
        sys.exit(1)

    print("\n3. Triggering aggregation backfill...")
    trigger_aggregation()

    print("\n4. Registering students in learning-style service...")
    print("   (Requires learning-style service running on :8006)")
    register_learning_style_profiles()

    print("\n5. Syncing to learning-style service...")
    trigger_learning_style_sync()

    print("\n" + "=" * 60)
    print("  DONE! Institute B demo data is ready.")
    print("=" * 60)
    print("\nNext steps:")
    print("  - Open LMS2:    http://localhost:8011/frontend/index.html")
    print("  - Open EduMind: http://localhost:5174")
    print("  - Admin login:  admin_b / admin_b (Institute B)")
    print("  - Student login: STU0006 (or any STU0006-STU0025)")
