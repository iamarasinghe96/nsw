#!/usr/bin/env python3
"""
Generate data/final_fields.json for the Service NSW kiosk app.
Keys must exactly match the form IDs in data/categories.json.
"""
import json, os

STATES = ["NSW","VIC","QLD","SA","WA","TAS","ACT","NT"]

# ── Reusable field-group helpers ──────────────────────────────────────────────

def f(label, name, typ, page, opts=None, req=True):
    return {"label": label, "field_name": name, "type": typ,
            "options": opts or [], "required": req, "page": page}

def person(page):
    return [
        f("Surname", "surname", "text", page),
        f("Given Names", "given_names", "text", page),
        f("Date of Birth", "date_of_birth", "date", page),
    ]

def addr(page):
    return [
        f("Street Address", "address", "text", page),
        f("Suburb", "suburb", "text", page),
        f("State", "state", "dropdown", page, STATES),
        f("Postcode", "postcode", "text", page),
    ]

def contact(page):
    return [
        f("Phone Number", "phone", "text", page),
        f("Email Address", "email", "text", page, req=False),
    ]

def decl(page):
    return [
        f("I declare that the information provided is true and correct",
          "declaration", "checkbox", page),
        f("Signature", "signature", "signature", page),
    ]

def vehicle_basics(page):
    return [
        f("Vehicle Registration Number", "vehicle_rego", "text", page),
        f("Vehicle Make", "vehicle_make", "text", page),
        f("Vehicle Model", "vehicle_model", "text", page),
        f("Year of Manufacture", "vehicle_year", "number", page),
    ]

# ── Form definitions — keyed by exact filename from categories.json ───────────

forms = {

# ════════════════════════════════════════════════════════════
# ACCESS TO INFORMATION
# ════════════════════════════════════════════════════════════
"45061574-internal-review-of-a-decision.pdf": [
    f("Full Name", "full_name", "text", 1),
    f("Phone Number", "phone", "text", 1),
    f("Email Address", "email", "text", 1),
    f("Date of Original Decision", "decision_date", "date", 1),
    f("Reference Number", "reference_number", "text", 1, req=False),
    f("Agency / Branch that made the Decision", "agency", "text", 2),
    f("Decision Being Reviewed", "decision_reviewed", "textarea", 2),
    f("Grounds for Review", "grounds_for_review", "textarea", 2),
    f("Preferred Outcome", "preferred_outcome", "textarea", 3, req=False),
    *decl(3),
],

"45064982-application-for-an-internal-review-of-a-decision.pdf": [
    f("Full Name", "full_name", "text", 1),
    f("Organisation (if applicable)", "organisation", "text", 1, req=False),
    f("Phone Number", "phone", "text", 1),
    f("Email Address", "email", "text", 1),
    f("Postal Address", "postal_address", "textarea", 2),
    f("Original Decision Date", "decision_date", "date", 2),
    f("Original Decision Reference", "original_decision_reference", "text", 2, req=False),
    f("What decision are you seeking a review of?", "decision_reviewed", "textarea", 2),
    f("Grounds for Review", "grounds_for_review", "textarea", 3),
    f("Documents Attached", "documents_attached", "radio", 3,
      ["Yes", "No"]),
    *decl(3),
],

# ════════════════════════════════════════════════════════════
# DRIVING INSTRUCTORS & ASSESSORS
# ════════════════════════════════════════════════════════════
"45061655-driving-instructor-licence-app.pdf": [
    *person(1),
    f("Gender", "gender", "radio", 1,
      ["Male", "Female", "Non-binary", "Prefer not to say"]),
    *addr(2),
    *contact(2),
    f("Current Driver Licence Number", "driver_licence_number", "text", 2),
    f("Licence Class", "licence_class", "dropdown", 3,
      ["C – Car", "R – Motorcycle", "Both"]),
    f("Years Licenced", "years_licenced", "number", 3),
    f("First Aid Certificate Number", "first_aid_cert", "text", 3),
    f("First Aid Certificate Expiry", "first_aid_expiry", "date", 3),
    f("Working With Children Check Number", "wwcc_number", "text", 3, req=False),
    *decl(4),
],

"45062462-driving-instructor-mutual-recognition.pdf": [
    *person(1),
    *contact(1),
    *addr(2),
    f("Current State / Territory of Licence", "current_state", "dropdown", 2, STATES),
    f("Licence Number (Current State)", "interstate_licence_number", "text", 2),
    f("Licence Class", "licence_class", "dropdown", 3,
      ["C – Car", "R – Motorcycle", "Both"]),
    f("Date Licence Issued", "licence_issued_date", "date", 3),
    f("Licence Expiry Date", "licence_expiry_date", "date", 3),
    f("Have you previously held a NSW driving instructor licence?",
      "previous_nsw_licence", "radio", 3, ["No", "Yes"]),
    *decl(4),
],

"45062468-driving-instructors-licence-application-for-renewal.pdf": [
    *person(1),
    f("Instructor Licence Number", "instructor_licence_number", "text", 1),
    *addr(2),
    *contact(2),
    f("Licence Class", "licence_class", "dropdown", 2,
      ["C – Car", "R – Motorcycle", "Both"]),
    f("Renewal Period", "renewal_period", "radio", 3,
      ["1 year", "2 years", "3 years"]),
    f("First Aid Certificate Number", "first_aid_cert", "text", 3),
    f("First Aid Certificate Expiry", "first_aid_expiry", "date", 3),
    f("Any changes to your circumstances?", "circumstances_changed",
      "radio", 3, ["No", "Yes – details below"]),
    f("Details of Changes (if applicable)", "change_details", "textarea", 3, req=False),
    *decl(4),
],

# ════════════════════════════════════════════════════════════
# DRIVER LICENSING
# ════════════════════════════════════════════════════════════
"45065696-applicant-witness-stat-dec-bar-cross-licence.pdf": [
    f("Applicant Full Name", "applicant_full_name", "text", 1),
    f("Applicant Date of Birth", "applicant_dob", "date", 1),
    f("Applicant Licence Number", "applicant_licence_number", "text", 1),
    f("Declaration Content", "declaration_content", "textarea", 2),
    f("Declared at (location)", "declared_at", "text", 3),
    f("Date of Declaration", "declared_date", "date", 3),
    f("Witness Full Name", "witness_name", "text", 3),
    f("Witness Capacity / Qualification", "witness_capacity", "text", 3),
    f("Witness Signature", "witness_signature", "signature", 3),
    f("Applicant Signature", "applicant_signature", "signature", 4),
],

"45071383-request-confirmation-overseas-licence-details.pdf": [
    *person(1),
    *contact(1),
    f("Country of Issue", "country_of_issue", "text", 2),
    f("Overseas Licence Number", "overseas_licence_number", "text", 2),
    f("Overseas Licence Class", "overseas_licence_class", "text", 2),
    f("Issue Date", "issue_date", "date", 2),
    f("Expiry Date", "expiry_date", "date", 2),
    f("Purpose of Request", "purpose_of_request", "radio", 3,
      ["Licence conversion", "Proof of overseas driving history", "Other"]),
    *decl(3),
],

"45071927-change-in-circumstances.pdf": [
    *person(1),
    f("Licence Number", "licence_number", "text", 1),
    *addr(2),
    *contact(2),
    f("Type of Change", "change_type", "radio", 3,
      ["Change of address", "Change of name", "Medical condition update",
       "Change of vehicle", "Other"]),
    f("Previous Details", "previous_details", "textarea", 3),
    f("New Details", "new_details", "textarea", 3),
    f("Effective Date of Change", "effective_date", "date", 3),
    *decl(4),
],

# ════════════════════════════════════════════════════════════
# E-TOLL & M5 SOUTH-WEST CASHBACK
# ════════════════════════════════════════════════════════════
"45065707-etoll-direct-debit-request-service-agreement.pdf": [
    f("Account Holder Name", "account_holder_name", "text", 1),
    f("e-Toll Account Number", "etoll_account_number", "text", 1),
    f("BSB", "bsb", "text", 2),
    f("Account Number", "bank_account_number", "text", 2),
    f("Account Name", "bank_account_name", "text", 2),
    f("Financial Institution", "financial_institution", "text", 2),
    f("Debit Amount", "debit_amount", "radio", 3,
      ["Minimum top-up amount", "Nominated amount"]),
    f("Nominated Amount ($)", "nominated_amount", "number", 3, req=False),
    f("Top-up Threshold ($)", "topup_threshold", "number", 3, req=False),
    *decl(3),
],

"45065750-credit-card-authority.pdf": [
    f("Cardholder Name", "cardholder_name", "text", 1),
    f("e-Toll Account Number", "etoll_account_number", "text", 1),
    f("Card Type", "card_type", "radio", 2,
      ["Visa", "Mastercard", "American Express"]),
    f("Card Number", "card_number", "text", 2),
    f("Expiry Date (MM/YY)", "card_expiry", "text", 2),
    f("Amount to Charge ($)", "charge_amount", "number", 3),
    f("I authorise this charge to my card", "authorise_charge", "checkbox", 3),
    *decl(3),
],

"45071217-heavy-vehicle-e-toll-tag.pdf": [
    f("Business Name", "business_name", "text", 1),
    f("ABN", "abn", "text", 1),
    *contact(1),
    *addr(2),
    f("Fleet Account Number (if existing)", "fleet_account_number", "text", 2, req=False),
    f("Number of Tags Required", "tags_required", "number", 2),
    f("Vehicle Registration Numbers", "vehicle_registrations", "textarea", 3),
    f("Axle Configuration", "axle_configuration", "radio", 3,
      ["2 axles", "3 axles", "4 axles", "5+ axles"]),
    f("Billing Preference", "billing_preference", "radio", 3,
      ["Pre-paid", "Post-paid monthly invoice"]),
    *decl(4),
],

"45071442-e-toll-confirmation.pdf": [
    f("Account Holder Name", "account_holder_name", "text", 1),
    f("e-Toll Account Number", "etoll_account_number", "text", 1),
    *contact(1),
    f("Vehicle Registration", "vehicle_rego", "text", 2),
    f("Vehicle State", "vehicle_state", "dropdown", 2, STATES),
    f("Tag Serial Number", "tag_serial_number", "text", 2),
    f("Confirmation Type", "confirmation_type", "radio", 3,
      ["New account activation", "Change of vehicle", "Additional vehicle", "Other"]),
    *decl(3),
],

"45071687-etoll-terms-and-conditions.pdf": [
    f("Full Name", "full_name", "text", 1),
    f("e-Toll Account Number", "etoll_account_number", "text", 1),
    f("Date", "acceptance_date", "date", 1),
    f("I have read and agree to the e-Toll Terms and Conditions",
      "agree_terms", "checkbox", 2),
    f("I consent to receiving electronic correspondence", "agree_email", "checkbox", 2),
    f("Signature", "signature", "signature", 2),
],

"45071696-install-your-e-toll-tag.pdf": [
    f("Account Holder Name", "account_holder_name", "text", 1),
    f("e-Toll Account Number", "etoll_account_number", "text", 1),
    f("Vehicle Registration", "vehicle_rego", "text", 1),
    f("Vehicle State", "vehicle_state", "dropdown", 2, STATES),
    f("Tag Serial Number (from tag)", "tag_serial_number", "text", 2),
    f("Tag Position on Windscreen", "tag_position", "radio", 2,
      ["Top centre", "Top left", "Top right", "Behind rear-view mirror"]),
    f("Installation Date", "installation_date", "date", 2),
    f("Tag is securely mounted and readable", "tag_mounted", "checkbox", 2),
    *decl(2),
],

"45071696a-install-e-toll-tag-obu610.pdf": [
    f("Account Holder Name", "account_holder_name", "text", 1),
    f("e-Toll Account Number", "etoll_account_number", "text", 1),
    f("Vehicle Registration", "vehicle_rego", "text", 1),
    f("OBU Serial Number", "obu_serial_number", "text", 2),
    f("Vehicle State", "vehicle_state", "dropdown", 2, STATES),
    f("Installation Date", "installation_date", "date", 2),
    f("Installer Name", "installer_name", "text", 2),
    f("Installer Company", "installer_company", "text", 2, req=False),
    f("OBU is correctly installed and powered", "obu_installed", "checkbox", 2),
    *decl(2),
],

# ════════════════════════════════════════════════════════════
# HEALTH PROFESSIONALS LICENCE
# ════════════════════════════════════════════════════════════
"45071885-interlock-medical-consultation-certificate.pdf": [
    f("Patient Surname", "patient_surname", "text", 1),
    f("Patient Given Names", "patient_given_names", "text", 1),
    f("Patient Date of Birth", "patient_dob", "date", 1),
    f("Patient Licence Number", "patient_licence_number", "text", 1),
    f("Consultation Date", "consultation_date", "date", 2),
    f("Treating Practitioner Name", "practitioner_name", "text", 2),
    f("Practitioner Registration Number", "practitioner_reg_number", "text", 2),
    f("Practice Name", "practice_name", "text", 2),
    f("Practice Phone", "practice_phone", "text", 2),
    f("Interlock Device Fitted?", "device_fitted", "radio", 3,
      ["Yes", "No"]),
    f("Device Serial Number", "device_serial", "text", 3, req=False),
    f("Medical Assessment Outcome", "assessment_outcome", "radio", 3,
      ["Patient is fit to drive with interlock",
       "Patient is not fit to drive at this time"]),
    f("Notes / Conditions", "notes", "textarea", 3, req=False),
    f("Practitioner Signature", "practitioner_signature", "signature", 4),
],

"45071886-interlock-installation-certificate.pdf": [
    f("Driver Surname", "driver_surname", "text", 1),
    f("Driver Given Names", "driver_given_names", "text", 1),
    f("Driver Licence Number", "driver_licence_number", "text", 1),
    f("Vehicle Registration", "vehicle_rego", "text", 2),
    f("Vehicle Make", "vehicle_make", "text", 2),
    f("Vehicle Model", "vehicle_model", "text", 2),
    f("Installer Company Name", "installer_company", "text", 2),
    f("Installer Accreditation Number", "installer_accreditation", "text", 2),
    f("Device Make", "device_make", "text", 3),
    f("Device Model", "device_model", "text", 3),
    f("Device Serial Number", "device_serial", "text", 3),
    f("Installation Date", "installation_date", "date", 3),
    f("Calibration Due Date", "calibration_due_date", "date", 3),
    f("Installer Signature", "installer_signature", "signature", 4),
],

# ════════════════════════════════════════════════════════════
# HEAVY VEHICLE OPERATOR
# ════════════════════════════════════════════════════════════
"45065676-heavy-vehicle-camera-image-request.pdf": [
    f("Full Name", "full_name", "text", 1),
    f("Organisation (if applicable)", "organisation", "text", 1, req=False),
    *contact(1),
    f("Incident Date", "incident_date", "date", 2),
    f("Incident Time (approx.)", "incident_time", "text", 2),
    f("Location / Intersection", "incident_location", "text", 2),
    f("Vehicle Registration", "vehicle_rego", "text", 2),
    f("Direction of Travel", "direction_of_travel", "text", 2, req=False),
    f("Purpose of Request", "request_purpose", "radio", 3,
      ["Insurance claim", "Legal proceedings", "Personal review", "Other"]),
    f("Additional Information", "additional_info", "textarea", 3, req=False),
    *decl(3),
],

"45071812-training-organisation-heavy-vehicle-competency-based-assessment.pdf": [
    f("Organisation Name", "org_name", "text", 1),
    f("RTO Number", "rto_number", "text", 1),
    f("Contact Name", "contact_name", "text", 1),
    *contact(1),
    *addr(2),
    f("Assessor Full Name", "assessor_name", "text", 2),
    f("Assessor Certificate IV Number", "assessor_cert_number", "text", 2),
    f("Assessment Location", "assessment_location", "text", 3),
    f("Assessment Date", "assessment_date", "date", 3),
    f("Licence Class Being Assessed", "licence_class", "dropdown", 3,
      ["LR – Light Rigid", "MR – Medium Rigid", "HR – Heavy Rigid",
       "HC – Heavy Combination", "MC – Multi Combination"]),
    f("Candidate Full Name", "candidate_name", "text", 3),
    f("Candidate Date of Birth", "candidate_dob", "date", 3),
    f("Assessment Outcome", "assessment_outcome", "radio", 4,
      ["Competent", "Not yet competent"]),
    f("Assessor Signature", "assessor_signature", "signature", 4),
],

"45072002-osom-escort-vehicle-driver.pdf": [
    *person(1),
    *contact(1),
    *addr(2),
    f("Current Driver Licence Number", "driver_licence_number", "text", 2),
    f("Licence Class", "licence_class", "dropdown", 2,
      ["C – Car", "LR – Light Rigid", "MR – Medium Rigid"]),
    f("Current Employer / Company", "employer_name", "text", 3),
    f("Employer Phone", "employer_phone", "text", 3),
    f("OSOM Pilot/Escort Experience (years)", "escort_experience_years", "number", 3),
    f("Pilot Licence Number (if held)", "pilot_licence_number", "text", 3, req=False),
    f("Relevant Certificates Held", "certificates_held", "textarea", 3, req=False),
    *decl(4),
],

"45072003-osom-escort-vehicle-provider.pdf": [
    f("Business / Company Name", "business_name", "text", 1),
    f("ABN", "abn", "text", 1),
    *addr(1),
    f("Contact Name", "contact_name", "text", 2),
    *contact(2),
    f("Number of Escort Vehicles", "escort_vehicle_count", "number", 2),
    f("Escort Vehicle Registrations", "escort_vehicle_registrations", "textarea", 3),
    f("Services Provided", "services_provided", "radio", 3,
      ["Pilot only", "Escort only", "Both pilot and escort"]),
    f("Operating Area", "operating_area", "textarea", 3),
    *decl(4),
],

# ════════════════════════════════════════════════════════════
# MARITIME & BOATING
# ════════════════════════════════════════════════════════════
"45072013-personal-watercraft-driver-licence.pdf": [
    *person(1),
    f("Gender", "gender", "radio", 1,
      ["Male", "Female", "Non-binary", "Prefer not to say"]),
    *addr(2),
    *contact(2),
    f("Current Driver Licence Number", "driver_licence_number", "text", 2, req=False),
    f("Have you previously held a PWC licence?", "previous_pwc_licence",
      "radio", 3, ["No", "Yes – provide details below"]),
    f("Previous Licence Details", "previous_licence_details", "textarea", 3, req=False),
    f("Have you completed a PWC safety course?", "safety_course_completed",
      "radio", 3, ["No", "Yes"]),
    f("Safety Course Certificate Number", "safety_course_cert", "text", 3, req=False),
    *decl(4),
],

"45072014-application-for-vessel-registration.pdf": [
    f("Owner Surname", "owner_surname", "text", 1),
    f("Owner Given Names", "owner_given_names", "text", 1),
    f("Date of Birth", "date_of_birth", "date", 1),
    *contact(1),
    *addr(2),
    f("Vessel Name", "vessel_name", "text", 2),
    f("Vessel Type", "vessel_type", "dropdown", 2,
      ["Motor vessel", "Sailing vessel", "Personal watercraft",
       "Canoe/kayak", "Rowing boat", "Other"]),
    f("Hull Material", "hull_material", "radio", 3,
      ["Fibreglass", "Aluminium", "Timber", "Steel", "Inflatable"]),
    f("Hull Colour", "hull_colour", "text", 3),
    f("Overall Length (m)", "vessel_length", "number", 3),
    f("Engine Power (kW)", "engine_power", "number", 3, req=False),
    f("Propulsion", "propulsion", "dropdown", 3,
      ["Inboard motor", "Outboard motor", "Sail", "Human-powered", "Electric"]),
    *decl(4),
],

"45072015-application-transfer-vessel-registration.pdf": [
    f("Current Owner Surname", "current_owner_surname", "text", 1),
    f("Current Owner Given Names", "current_owner_given_names", "text", 1),
    f("Current Owner Phone", "current_owner_phone", "text", 1),
    f("New Owner Surname", "new_owner_surname", "text", 2),
    f("New Owner Given Names", "new_owner_given_names", "text", 2),
    f("New Owner Date of Birth", "new_owner_dob", "date", 2),
    f("New Owner Phone", "new_owner_phone", "text", 2),
    f("New Owner Email", "new_owner_email", "text", 2, req=False),
    f("Vessel Registration Number", "vessel_registration_number", "text", 3),
    f("Vessel Name", "vessel_name", "text", 3),
    f("Transfer Date", "transfer_date", "date", 3),
    f("Sale Price ($)", "sale_price", "number", 3),
    f("Current Owner Signature", "current_owner_signature", "signature", 4),
    f("New Owner Signature", "new_owner_signature", "signature", 4),
],

# ════════════════════════════════════════════════════════════
# MISCELLANEOUS
# ════════════════════════════════════════════════════════════
"45062798-road-occupancy-licence-app-development-activities.pdf": [
    f("Applicant Name", "applicant_name", "text", 1),
    f("Organisation", "organisation", "text", 1),
    f("ABN", "abn", "text", 1, req=False),
    *contact(1),
    *addr(2),
    f("Development Application Number", "da_number", "text", 2),
    f("Proposed Work Description", "work_description", "textarea", 2),
    f("Road(s) Affected", "roads_affected", "textarea", 3),
    f("Start Date", "start_date", "date", 3),
    f("End Date", "end_date", "date", 3),
    f("Hours of Operation", "hours_of_operation", "text", 3),
    f("Traffic Control Plan Attached?", "tcp_attached", "radio", 3,
      ["Yes", "No – to follow"]),
    *decl(4),
],

"45065401-cutback-bitumin-prime-primerseal-daily-record.pdf": [
    f("Contractor Name", "contractor_name", "text", 1),
    f("Contract Number", "contract_number", "text", 1),
    f("Date", "record_date", "date", 1),
    f("Road Name / Location", "road_location", "text", 1),
    f("Works Supervisor", "works_supervisor", "text", 2),
    f("Product Type", "product_type", "radio", 2,
      ["Cutback bitumen", "Prime", "Primerseal"]),
    f("Application Rate (L/m²)", "application_rate", "number", 2),
    f("Temperature at Time of Application (°C)", "temperature", "number", 2),
    f("Total Area Treated (m²)", "area_treated", "number", 3),
    f("Volume Applied (L)", "volume_applied", "number", 3),
    f("Weather Conditions", "weather_conditions", "text", 3),
    f("Supervisor Signature", "supervisor_signature", "signature", 3),
],

"45065403-cutback-bitumin-seal-reseal-daily-record.pdf": [
    f("Contractor Name", "contractor_name", "text", 1),
    f("Contract Number", "contract_number", "text", 1),
    f("Date", "record_date", "date", 1),
    f("Road Name / Location", "road_location", "text", 1),
    f("Works Supervisor", "works_supervisor", "text", 2),
    f("Seal Type", "seal_type", "radio", 2,
      ["Single coat seal", "Reseal", "Geotextile seal"]),
    f("Binder Type", "binder_type", "text", 2),
    f("Application Rate (L/m²)", "application_rate", "number", 2),
    f("Temperature at Time of Application (°C)", "temperature", "number", 2),
    f("Total Area Treated (m²)", "area_treated", "number", 3),
    f("Volume of Binder Applied (L)", "volume_binder", "number", 3),
    f("Aggregate Size (mm)", "aggregate_size", "number", 3),
    f("Supervisor Signature", "supervisor_signature", "signature", 3),
],

"45065405-conventional-sam-sami-daily-record.pdf": [
    f("Contractor Name", "contractor_name", "text", 1),
    f("Contract Number", "contract_number", "text", 1),
    f("Date", "record_date", "date", 1),
    f("Road Name / Location", "road_location", "text", 1),
    f("Works Supervisor", "works_supervisor", "text", 2),
    f("Treatment Type", "treatment_type", "radio", 2,
      ["Conventional SAM", "SAMI"]),
    f("Material Specification", "material_spec", "text", 2),
    f("Application Rate (kg/m²)", "application_rate", "number", 2),
    f("Paving Width (m)", "paving_width", "number", 3),
    f("Total Area Treated (m²)", "area_treated", "number", 3),
    f("Mat Thickness (mm)", "mat_thickness", "number", 3),
    f("Air Temperature (°C)", "air_temperature", "number", 3),
    f("Supervisor Signature", "supervisor_signature", "signature", 3),
],

"45070768-witness-letter.pdf": [
    f("Witness Full Name", "witness_name", "text", 1),
    f("Witness Occupation / Capacity", "witness_capacity", "text", 1),
    f("Witness Phone", "witness_phone", "text", 1),
    f("Witness Address", "witness_address", "textarea", 1),
    f("Subject Person Full Name", "subject_name", "text", 2),
    f("Subject Person Date of Birth", "subject_dob", "date", 2),
    f("Purpose of Witness Letter", "purpose", "textarea", 2),
    f("Statement of Witness", "statement", "textarea", 3),
    f("Date", "witness_date", "date", 3),
    f("Witness Signature", "witness_signature", "signature", 3),
],

# ════════════════════════════════════════════════════════════
# PUBLIC PASSENGER VEHICLE OPERATOR
# ════════════════════════════════════════════════════════════
"45071942-operator-accreditation-4wd-tourist-vehicle.pdf": [
    f("Business / Trading Name", "business_name", "text", 1),
    f("ABN", "abn", "text", 1),
    *addr(1),
    f("Contact Name", "contact_name", "text", 2),
    *contact(2),
    f("Number of 4WD Tourist Vehicles", "vehicle_count", "number", 2),
    f("Vehicle Registration Numbers", "vehicle_registrations", "textarea", 3),
    f("Driver Licence Number(s)", "driver_licences", "textarea", 3),
    f("Public Liability Insurance Policy Number", "insurance_policy_number", "text", 3),
    f("Insurance Expiry Date", "insurance_expiry", "date", 3),
    f("Operating Area / Routes", "operating_area", "textarea", 4),
    *decl(4),
],

"45071943-operator-accreditation-motorcycle.pdf": [
    f("Business / Trading Name", "business_name", "text", 1),
    f("ABN", "abn", "text", 1),
    *addr(1),
    f("Contact Name", "contact_name", "text", 2),
    *contact(2),
    f("Number of Motorcycles", "motorcycle_count", "number", 2),
    f("Motorcycle Registration Numbers", "motorcycle_registrations", "textarea", 3),
    f("Rider Licence Number(s)", "rider_licences", "textarea", 3),
    f("Public Liability Insurance Policy Number", "insurance_policy_number", "text", 3),
    f("Insurance Expiry Date", "insurance_expiry", "date", 3),
    f("Operating Area / Tours", "operating_area", "textarea", 4),
    *decl(4),
],

# ════════════════════════════════════════════════════════════
# VEHICLE REGISTRATION
# ════════════════════════════════════════════════════════════
"45071058-pay-your-registration.pdf": [
    f("Owner Surname", "owner_surname", "text", 1),
    f("Owner Given Names", "owner_given_names", "text", 1),
    f("Customer Number", "customer_number", "text", 1, req=False),
    f("Vehicle Registration Plate", "vehicle_rego", "text", 2),
    f("Vehicle Identification Number (VIN)", "vin", "text", 2),
    f("Registration Period", "registration_period", "radio", 2,
      ["3 months", "6 months", "12 months"]),
    f("Payment Method", "payment_method", "radio", 3,
      ["Credit/Debit card", "BPAY", "Direct debit", "Cash (in person)"]),
    *contact(3),
    *decl(3),
],

"45071806-rally-vehicle-approved-operations.pdf": [
    f("Operator / Club Name", "operator_name", "text", 1),
    f("Contact Name", "contact_name", "text", 1),
    *contact(1),
    *addr(2),
    f("Vehicle Registration", "vehicle_rego", "text", 2),
    f("Vehicle Make", "vehicle_make", "text", 2),
    f("Vehicle Model", "vehicle_model", "text", 2),
    f("Rally Event Name", "event_name", "text", 3),
    f("Event Date(s)", "event_dates", "text", 3),
    f("Event Location / Route", "event_location", "textarea", 3),
    f("Motorsport Australia Permit Number", "motorsport_permit", "text", 3, req=False),
    *decl(4),
],

"45071875-traders-plates-condition-of-use.pdf": [
    f("Dealer / Business Name", "dealer_name", "text", 1),
    f("Dealer Licence Number", "dealer_licence_number", "text", 1),
    f("ABN", "abn", "text", 1),
    *addr(2),
    *contact(2),
    f("Traders Plate Number(s)", "traders_plate_numbers", "text", 2),
    f("Purpose of Use", "purpose_of_use", "radio", 3,
      ["Test drive", "Vehicle demonstration", "Transit to customer", "Other"]),
    f("I understand and agree to the conditions of use for traders plates",
      "agree_conditions", "checkbox", 3),
    *decl(3),
],

# ════════════════════════════════════════════════════════════
# VEHICLE SAFETY COMPLIANCE (VSCCS)
# ════════════════════════════════════════════════════════════
"45071422-light-vehicle-pre-delivery-checklist.pdf": [
    f("Dealer Name", "dealer_name", "text", 1),
    f("Dealer Licence Number", "dealer_licence_number", "text", 1),
    f("Vehicle Make", "vehicle_make", "text", 2),
    f("Vehicle Model", "vehicle_model", "text", 2),
    f("VIN", "vin", "text", 2),
    f("Registration Plate (if already allocated)", "vehicle_rego", "text", 2, req=False),
    f("Odometer Reading (km)", "odometer", "number", 2),
    f("Delivery Date", "delivery_date", "date", 3),
    f("Purchaser Full Name", "purchaser_name", "text", 3),
    f("Lights — checked and functional", "check_lights", "checkbox", 3),
    f("Brakes — checked and functional", "check_brakes", "checkbox", 3),
    f("Tyres — correct pressure and condition", "check_tyres", "checkbox", 3),
    f("Safety equipment present (spare tyre, jack, warning triangle)",
      "check_safety_equipment", "checkbox", 3),
    f("Service manual and warranty documents provided", "check_documents", "checkbox", 3),
    f("Pre-delivery inspection completed satisfactorily", "inspection_complete", "checkbox", 4),
    f("Inspector Signature", "inspector_signature", "signature", 4),
],

"45071423-motorcycle-pre-delivery-checklist.pdf": [
    f("Dealer Name", "dealer_name", "text", 1),
    f("Dealer Licence Number", "dealer_licence_number", "text", 1),
    f("Motorcycle Make", "vehicle_make", "text", 2),
    f("Motorcycle Model", "vehicle_model", "text", 2),
    f("VIN / Engine Number", "vin", "text", 2),
    f("Odometer Reading (km)", "odometer", "number", 2),
    f("Delivery Date", "delivery_date", "date", 3),
    f("Purchaser Full Name", "purchaser_name", "text", 3),
    f("Lights — checked and functional", "check_lights", "checkbox", 3),
    f("Brakes — checked and functional", "check_brakes", "checkbox", 3),
    f("Tyres — correct pressure and condition", "check_tyres", "checkbox", 3),
    f("Helmet lock present", "check_helmet_lock", "checkbox", 3),
    f("Owner's manual and warranty documents provided", "check_documents", "checkbox", 3),
    f("Pre-delivery inspection completed satisfactorily", "inspection_complete", "checkbox", 4),
    f("Inspector Signature", "inspector_signature", "signature", 4),
],

"45071424-light-trailer-and-caravan-pre-delivery-checklist.pdf": [
    f("Dealer Name", "dealer_name", "text", 1),
    f("Dealer Licence Number", "dealer_licence_number", "text", 1),
    f("Trailer / Caravan Make", "vehicle_make", "text", 2),
    f("Trailer / Caravan Model", "vehicle_model", "text", 2),
    f("VIN", "vin", "text", 2),
    f("Tare Mass (kg)", "tare_mass", "number", 2),
    f("Aggregate Trailer Mass (kg)", "atm", "number", 2),
    f("Delivery Date", "delivery_date", "date", 3),
    f("Purchaser Full Name", "purchaser_name", "text", 3),
    f("Lights and indicators — checked and functional", "check_lights", "checkbox", 3),
    f("Brakes (if applicable) — checked and functional", "check_brakes", "checkbox", 3),
    f("Coupling and safety chain — correct and secure", "check_coupling", "checkbox", 3),
    f("Tyres — correct pressure and condition", "check_tyres", "checkbox", 3),
    f("Owner's manual and warranty documents provided", "check_documents", "checkbox", 3),
    f("Pre-delivery inspection completed satisfactorily", "inspection_complete", "checkbox", 4),
    f("Inspector Signature", "inspector_signature", "signature", 4),
],

}  # end forms dict

# ── Write output ──────────────────────────────────────────────────────────────

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "final_fields.json")
with open(out_path, "w") as fh:
    json.dump(forms, fh, indent=2)

print(f"Written {len(forms)} forms to {out_path}")
for k, v in forms.items():
    print(f"  {k}: {len(v)} fields")
