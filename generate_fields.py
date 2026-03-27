#!/usr/bin/env python3
"""Generate data/final_fields.json for the Service NSW kiosk app."""
import json, os

STATES = ["NSW","VIC","QLD","SA","WA","TAS","ACT","NT"]

def addr_fields(page):
    return [
        {"label":"Street Address","field_name":"address","type":"text","options":[],"required":True,"page":page},
        {"label":"Suburb","field_name":"suburb","type":"text","options":[],"required":True,"page":page},
        {"label":"State","field_name":"state","type":"dropdown","options":STATES,"required":True,"page":page},
        {"label":"Postcode","field_name":"postcode","type":"text","options":[],"required":True,"page":page},
    ]

def contact_fields(page):
    return [
        {"label":"Phone Number","field_name":"phone","type":"text","options":[],"required":True,"page":page},
        {"label":"Email Address","field_name":"email","type":"text","options":[],"required":False,"page":page},
    ]

def person_fields(page):
    return [
        {"label":"Surname","field_name":"surname","type":"text","options":[],"required":True,"page":page},
        {"label":"Given Names","field_name":"given_names","type":"text","options":[],"required":True,"page":page},
        {"label":"Date of Birth","field_name":"date_of_birth","type":"date","options":[],"required":True,"page":page},
    ]

def sig_decl(page):
    return [
        {"label":"I declare that the information provided is true and correct","field_name":"declaration","type":"checkbox","options":[],"required":True,"page":page},
        {"label":"Signature","field_name":"signature","type":"signature","options":[],"required":True,"page":page},
    ]

def f(label, name, typ, page, opts=None, req=True):
    return {"label":label,"field_name":name,"type":typ,"options":opts or [],"required":req,"page":page}

forms = {

# ── Access to Information ──────────────────────────────────────────────────────
"45013321-access-to-information-application.pdf": [
    f("Full Name","full_name","text",1), f("Organisation (if applicable)","organisation","text",1,req=False),
    f("Phone Number","phone","text",1), f("Email Address","email","text",1),
    f("Information Requested","information_requested","textarea",2),
    f("Preferred Format","preferred_format","radio",2,["Paper copy","Electronic copy","Inspection of records"]),
    f("Reason for Request","reason_for_request","textarea",2,req=False),
    f("I declare this information is true and correct","declaration","checkbox",3),
    f("Signature","signature","signature",3),
],
"45013322-gipa-internal-review-application.pdf": [
    f("Full Name","full_name","text",1), f("Email Address","email","text",1),
    f("Phone Number","phone","text",1), f("Date of Original Decision","decision_date","date",1),
    f("Original Decision Reference Number","original_decision_reference","text",1),
    f("Grounds for Review","grounds_for_review","textarea",2),
    f("Preferred Outcome","preferred_outcome","textarea",2),
    f("I declare this application is true and correct","declaration","checkbox",3),
    f("Signature","signature","signature",3),
],

# ── AIS ────────────────────────────────────────────────────────────────────────
"45060001-ais-application-new.pdf": [
    f("Business Name","business_name","text",1), f("ABN","abn","text",1),
    f("Trading Name","trading_name","text",1,req=False),
    *addr_fields(1),
    f("Full Name (Licensee)","full_name","text",2), f("Date of Birth","date_of_birth","date",2),
    *contact_fields(2), f("Mechanic Licence Number","mechanic_licence_number","text",2),
    f("Station Class","station_class","radio",3,["Class A – Light Vehicles","Class B – Light and Heavy Vehicles","Class C – Motorcycles Only"]),
    f("Inspection Categories","inspection_categories","textarea",3,req=False),
    *sig_decl(4),
],
"45060002-ais-renewal-application.pdf": [
    f("Station Name","station_name","text",1), f("Station Number","station_number","text",1),
    *addr_fields(1),
    f("Full Name","full_name","text",2), *contact_fields(2), f("Renewal Year","renewal_year","number",2),
    *sig_decl(3),
],
"45060003-ais-change-of-details.pdf": [
    f("Station Name","station_name","text",1), f("Station Number","station_number","text",1),
    f("Full Name","full_name","text",1), *contact_fields(1),
    f("Type of Change","change_type","radio",2,["Change of address","Change of owner","Change of station class","Other"]),
    f("New Details","new_details","textarea",2),
    *sig_decl(3),
],

# ── Driver Licensing ───────────────────────────────────────────────────────────
"45070018-licence-application.pdf": [
    *person_fields(1),
    f("Gender","gender","radio",1,["Male","Female","Non-binary","Prefer not to say"]),
    f("Place of Birth","place_of_birth","text",1),
    *addr_fields(2), *contact_fields(2),
    f("Licence Class","licence_class","dropdown",3,["C – Car","R – Motorcycle","LR – Light Rigid","MR – Medium Rigid","HR – Heavy Rigid","HC – Heavy Combination","MC – Multi Combination"]),
    f("Previous Licence Number","previous_licence_number","text",3,req=False),
    f("Previous Licence State","previous_licence_state","dropdown",3,STATES,req=False),
    f("Medical Conditions","medical_conditions","radio",4,["No","Yes – details attached"]),
    *sig_decl(4),
],
"45071506-licence-renewal-application.pdf": [
    *person_fields(1), f("Current Licence Number","current_licence_number","text",1),
    *addr_fields(2), *contact_fields(2),
    f("Renewal Period","renewal_period","radio",3,["1 year","3 years","5 years"]),
    f("Medical Conditions","medical_conditions","radio",3,["No","Yes – details attached"]),
    *sig_decl(3),
],
"45070019-licence-replacement-application.pdf": [
    *person_fields(1), f("Licence Number","licence_number","text",1),
    *addr_fields(2), *contact_fields(2),
    f("Reason for Replacement","reason_for_replacement","radio",3,["Lost","Stolen","Damaged","Name change"]),
    f("Police Report Number (if applicable)","police_report_number","text",3,req=False),
    *sig_decl(3),
],
"45070020-overseas-licence-conversion.pdf": [
    *person_fields(1), f("Country of Issue","country_of_issue","text",1),
    *addr_fields(2), *contact_fields(2),
    f("Overseas Licence Number","overseas_licence_number","text",3),
    f("Overseas Licence Class","overseas_licence_class","text",3),
    f("Years Held","years_held","number",3),
    f("Translation Required","translation_required","radio",3,["No","Yes"]),
    *sig_decl(4),
],
"45070021-medical-condition-declaration.pdf": [
    *person_fields(1), f("Licence Number","licence_number","text",1),
    f("Condition Type","condition_type","radio",2,["Vision impairment","Hearing impairment","Physical disability","Neurological condition","Cardiovascular condition","Other"]),
    f("Condition Details","condition_details","textarea",2),
    f("Treating Practitioner","treating_practitioner","text",2),
    f("Practitioner Phone","practitioner_phone","text",2),
    f("Driving Restrictions (if any)","driving_restrictions","textarea",3,req=False),
    *sig_decl(3),
],
"45070022-name-change-on-licence.pdf": [
    f("Former Surname","former_surname","text",1), f("Former Given Names","former_given_names","text",1),
    f("New Surname","new_surname","text",1), f("New Given Names","new_given_names","text",1),
    f("Date of Birth","date_of_birth","date",1),
    f("Licence Number","licence_number","text",2),
    *addr_fields(2), *contact_fields(2),
    f("Reason for Change","reason_for_change","radio",3,["Marriage","Divorce","Deed poll","Other"]),
    *sig_decl(3),
],

# ── Driving Instructors & Assessors ───────────────────────────────────────────
"45080001-driving-instructor-accreditation-application.pdf": [
    *person_fields(1), *addr_fields(1),
    *contact_fields(2), f("Current Licence Number","current_licence_number","text",2),
    f("Years Licensed","years_licenced","number",2),
    f("Accreditation Class","accreditation_class","radio",3,["Class C – Car","Class R – Motorcycle","Both"]),
    f("First Aid Certificate","first_aid_certificate","radio",3,["Yes","No"]),
    f("Working With Children Check Number","working_with_children_check","text",3,req=False),
    *sig_decl(4),
],
"45080002-driving-assessor-application.pdf": [
    *person_fields(1), *contact_fields(1),
    *addr_fields(2), f("Employer Name","employer_name","text",2), f("Employer ABN","employer_abn","text",2,req=False),
    f("Assessment Types","assessment_types","textarea",3), f("Qualifications","qualifications","textarea",3),
    *sig_decl(4),
],

# ── e-Toll & M5 ───────────────────────────────────────────────────────────────
"45090001-etoll-account-application.pdf": [
    f("Account Type","account_type","radio",1,["Personal","Business"]),
    f("Full Name","full_name","text",1), f("Date of Birth","date_of_birth","date",1),
    *contact_fields(1),
    *addr_fields(2),
    f("Vehicle Plate Number","vehicle_plate","text",2),
    f("Vehicle State","vehicle_state","dropdown",2,STATES),
    f("Payment Method","payment_method","radio",3,["Credit card","Direct debit","Prepaid"]),
    *sig_decl(3),
],
"45090002-m5-cashback-application.pdf": [
    f("Full Name","full_name","text",1), f("Date of Birth","date_of_birth","date",1),
    *contact_fields(1),
    *addr_fields(2),
    f("Vehicle Plate Number","vehicle_plate","text",2),
    f("Vehicle Type","vehicle_type","radio",2,["Car","Motorcycle","Light commercial"]),
    f("Bank Name","bank_name","text",3), f("BSB","bsb","text",3),
    f("Account Number","account_number","text",3),
    *sig_decl(3),
],
"45090003-etoll-dispute-form.pdf": [
    f("Full Name","full_name","text",1), f("e-Toll Account Number","account_number_etoll","text",1),
    *contact_fields(1),
    f("Transaction Date","transaction_date","date",2),
    f("Toll Road","toll_road","dropdown",2,["M2 Hills Motorway","M5 South West","M7 Westlink","Sydney Harbour Bridge","Eastern Distributor","Lane Cove Tunnel","Cross City Tunnel"]),
    f("Disputed Amount ($)","dispute_amount","number",2),
    f("Reason for Dispute","reason_for_dispute","textarea",3),
    f("Supporting Evidence","supporting_evidence","textarea",3,req=False),
    *sig_decl(3),
],

# ── Health Professionals ───────────────────────────────────────────────────────
"45100001-health-professional-medical-report.pdf": [
    f("Patient Surname","patient_surname","text",1), f("Patient Given Names","patient_given_names","text",1),
    f("Patient Date of Birth","patient_date_of_birth","date",1), f("Patient Licence Number","patient_licence_number","text",1),
    f("Practitioner Name","practitioner_name","text",2),
    f("Practitioner Registration Number","practitioner_registration_number","text",2),
    f("Practitioner Type","practitioner_type","dropdown",2,["General Practitioner","Specialist","Ophthalmologist","Optometrist","Neurologist","Cardiologist","Other"]),
    f("Practice Address","practice_address","text",2),
    f("Medical Condition","medical_condition","textarea",3),
    f("Fitness to Drive","fitness_to_drive","radio",3,["Fit to drive unconditionally","Fit to drive with conditions","Not fit to drive"]),
    f("Recommended Conditions (if any)","recommended_conditions","textarea",3,req=False),
    f("Review Date","review_date","date",4,req=False),
    *sig_decl(4),
],
"45100002-optometrist-vision-certificate.pdf": [
    f("Patient Surname","patient_surname","text",1), f("Patient Given Names","patient_given_names","text",1),
    f("Patient Date of Birth","patient_date_of_birth","date",1), f("Patient Licence Number","patient_licence_number","text",1),
    f("Optometrist Name","optometrist_name","text",2), f("Registration Number","registration_number","text",2),
    f("Practice Name","practice_name","text",2), f("Practice Phone","practice_phone","text",2),
    f("Visual Acuity (Right Eye)","visual_acuity_right","text",3),
    f("Visual Acuity (Left Eye)","visual_acuity_left","text",3),
    f("Visual Acuity (Both Eyes)","visual_acuity_both","text",3),
    f("Visual Field","visual_field","radio",3,["Normal","Abnormal"]),
    f("Corrective Lenses Required","corrective_lenses_required","radio",3,["No","Yes – spectacles","Yes – contact lenses"]),
    *sig_decl(4),
],

# ── Heavy Vehicle ──────────────────────────────────────────────────────────────
"45110001-heavy-vehicle-permit-application.pdf": [
    f("Operator Name","operator_name","text",1), f("ABN","abn","text",1),
    *addr_fields(1),
    *contact_fields(2), f("Vehicle Registration","vehicle_registration","text",2),
    f("Vehicle Type","vehicle_type","dropdown",2,["Rigid truck","Articulated truck","B-double","Road train","Oversize vehicle"]),
    f("Permit Type","permit_type","radio",3,["Single trip","Multi-trip","Annual"]),
    f("Route Description","route_description","textarea",3),
    f("Proposed Travel Date","proposed_travel_date","date",3),
    *sig_decl(4),
],
"45110002-heavy-vehicle-mass-dimension-permit.pdf": [
    f("Operator Name","operator_name","text",1), f("ABN","abn","text",1),
    *contact_fields(1),
    f("Vehicle Registration","vehicle_registration","text",2),
    f("Gross Mass (kg)","gross_mass","number",2), f("Overall Length (m)","overall_length","number",2),
    f("Overall Width (m)","overall_width","number",2), f("Overall Height (m)","overall_height","number",2),
    f("Route Start","route_start","text",3), f("Route End","route_end","text",3),
    f("Travel Dates","travel_dates","textarea",3),
    f("Escort Required","escort_required","radio",3,["No","Yes"]),
    *sig_decl(4),
],
"45110003-livestock-transport-accreditation.pdf": [
    f("Business Name","business_name","text",1), f("ABN","abn","text",1),
    *addr_fields(1),
    f("Contact Name","contact_name","text",2), *contact_fields(2),
    f("Vehicle Registration","vehicle_registration","text",2),
    f("Livestock Types","livestock_types","textarea",3),
    f("Accreditation Type","accreditation_type","radio",3,["Standard","Advanced"]),
    f("Previous Accreditation","previous_accreditation","radio",3,["No","Yes"]),
    *sig_decl(4),
],

# ── Maritime & Boating ─────────────────────────────────────────────────────────
"45120001-vessel-registration-application.pdf": [
    f("Owner Surname","owner_surname","text",1), f("Owner Given Names","owner_given_names","text",1),
    f("Date of Birth","date_of_birth","date",1), *contact_fields(1),
    *addr_fields(2),
    f("Vessel Name","vessel_name","text",2),
    f("Vessel Type","vessel_type","dropdown",2,["Motor vessel","Sailing vessel","Personal watercraft","Canoe/kayak","Rowing boat","Other"]),
    f("Hull Material","hull_material","radio",3,["Fibreglass","Aluminium","Timber","Steel","Inflatable"]),
    f("Hull Colour","hull_colour","text",3),
    f("Engine Power (kW)","engine_power","number",3,req=False),
    f("Propulsion","propulsion","dropdown",3,["Inboard motor","Outboard motor","Sail","Human-powered","Electric"]),
    *sig_decl(4),
],
"45120002-vessel-transfer-of-ownership.pdf": [
    f("Seller Surname","seller_surname","text",1), f("Seller Given Names","seller_given_names","text",1),
    f("Seller Phone","seller_phone","text",1),
    f("Buyer Surname","buyer_surname","text",2), f("Buyer Given Names","buyer_given_names","text",2),
    f("Buyer Date of Birth","buyer_date_of_birth","date",2),
    f("Buyer Phone","buyer_phone","text",2), f("Buyer Email","buyer_email","text",2),
    f("Vessel Registration Number","vessel_registration_number","text",3),
    f("Vessel Name","vessel_name","text",3), f("Transfer Date","transfer_date","date",3),
    f("Sale Price ($)","sale_price","number",3),
    f("Seller Signature","seller_signature","signature",4),
    f("Buyer Signature","buyer_signature","signature",4),
],
"45120003-boat-licence-application.pdf": [
    *person_fields(1),
    f("Gender","gender","radio",1,["Male","Female","Non-binary","Prefer not to say"]),
    *addr_fields(2), *contact_fields(2),
    f("Licence Type","licence_type","radio",3,["General boat licence","Personal watercraft licence","Master licence"]),
    f("Current Driver Licence Number","current_driver_licence_number","text",3,req=False),
    f("Boating Experience","boating_experience","textarea",3,req=False),
    *sig_decl(4),
],
"45120004-marine-licence-replacement.pdf": [
    *person_fields(1), f("Licence Number","licence_number","text",1),
    *addr_fields(2), *contact_fields(2),
    f("Reason for Replacement","reason_for_replacement","radio",3,["Lost","Stolen","Damaged"]),
    f("Police Event Number (if stolen)","police_event_number","text",3,req=False),
    *sig_decl(3),
],

# ── Miscellaneous ──────────────────────────────────────────────────────────────
"45130001-general-enquiry-form.pdf": [
    f("Full Name","full_name","text",1), *contact_fields(1),
    f("Enquiry Type","enquiry_type","dropdown",2,["Registration","Licensing","Fines","Points","Other"]),
    f("Subject","subject","text",2), f("Message","message","textarea",2),
    f("Preferred Contact Method","preferred_contact","radio",3,["Email","Phone","Post"]),
    f("I agree to be contacted","declaration","checkbox",3),
],
"45130002-customer-feedback-form.pdf": [
    f("Full Name","full_name","text",1), *contact_fields(1), f("Visit Date","visit_date","date",1),
    f("Service Centre","service_centre","text",2),
    f("Feedback Type","feedback_type","radio",2,["Compliment","Complaint","Suggestion"]),
    f("Feedback Details","feedback_details","textarea",2),
    f("Resolution Sought","resolution_sought","textarea",3,req=False),
    f("I consent to being contacted about this feedback","declaration","checkbox",3),
],
"45130003-statutory-declaration.pdf": [
    *person_fields(1), *addr_fields(1),
    f("Occupation","occupation","text",2), f("Declaration Content","declaration_content","textarea",2),
    f("Declared At (location)","declared_at","text",3), f("Date Declared","declared_date","date",3),
    f("Witness Name","witness_name","text",3), f("Witness Capacity","witness_capacity","text",3),
    *sig_decl(4),
],

# ── Mobility Parking ──────────────────────────────────────────────────────────
"45140001-mobility-parking-application.pdf": [
    *person_fields(1), *contact_fields(1),
    *addr_fields(2),
    f("Vehicle Registration","vehicle_registration","text",2),
    f("Vehicle Make","vehicle_make","text",2,req=False),
    f("Disability Type","disability_type","dropdown",3,["Mobility impairment","Visual impairment","Other"]),
    f("Condition Details","condition_details","textarea",3),
    f("Treating Practitioner","treating_practitioner","text",3),
    f("Practitioner Phone","practitioner_phone","text",3),
    *sig_decl(4),
],
"45140002-mobility-parking-renewal.pdf": [
    *person_fields(1), f("Permit Number","permit_number","text",1),
    *addr_fields(2), *contact_fields(2), f("Vehicle Registration","vehicle_registration","text",2),
    f("Has your condition changed?","condition_changed","radio",3,["No","Yes – provide details"]),
    f("Change Details","change_details","textarea",3,req=False),
    *sig_decl(3),
],
"45140003-mobility-parking-replacement.pdf": [
    *person_fields(1), f("Permit Number","permit_number","text",1),
    *addr_fields(2), *contact_fields(2),
    f("Reason for Replacement","reason_for_replacement","radio",3,["Lost","Stolen","Damaged"]),
    f("Police Report Number (if applicable)","police_report_number","text",3,req=False),
    *sig_decl(3),
],

# ── Motor Dealer ───────────────────────────────────────────────────────────────
"45150001-motor-dealer-licence-application.pdf": [
    f("Business Name","business_name","text",1), f("ABN","abn","text",1),
    f("Trading Name","trading_name","text",1,req=False),
    *addr_fields(1),
    f("Contact Name","contact_name","text",2), *contact_fields(2),
    f("Date of Birth","date_of_birth","date",2),
    f("Dealer Type","dealer_type","radio",3,["New vehicles only","Used vehicles only","Both new and used","Wholesale only"]),
    f("Yard Address","yard_address","textarea",3),
    f("Previously held a dealer licence?","previous_licence_held","radio",3,["No","Yes"]),
    *sig_decl(4),
],
"45150002-motor-dealer-renewal.pdf": [
    f("Licence Number","licence_number","text",1), f("Business Name","business_name","text",1),
    f("ABN","abn","text",1), *contact_fields(1),
    *addr_fields(2), f("Contact Name","contact_name","text",2),
    f("Changes to Details","changes_to_details","radio",3,["No changes","Changes – see below"]),
    f("Change Details","change_details","textarea",3,req=False),
    *sig_decl(3),
],
"45150003-dealer-salesperson-application.pdf": [
    *person_fields(1), *contact_fields(1),
    *addr_fields(2),
    f("Employing Dealer Licence Number","employing_dealer_licence_number","text",2),
    f("Employing Dealer Name","employing_dealer_name","text",2),
    f("Previously held a salesperson licence?","previous_licence","radio",3,["No","Yes"]),
    f("Previous Licence Number","previous_licence_number","text",3,req=False),
    *sig_decl(3),
],

# ── Public Passenger Vehicle Operator ─────────────────────────────────────────
"45160001-taxi-driver-authority-application.pdf": [
    *person_fields(1), *contact_fields(1),
    *addr_fields(2),
    f("Driver Licence Number","driver_licence_number","text",2),
    f("Driver Licence Class","driver_licence_class","dropdown",2,["C – Car","HC – Heavy Combination","Other"]),
    f("Taxi Network","taxi_network","text",3),
    f("Working With Children Check Number","working_with_children_check","text",3,req=False),
    f("English Proficiency","english_proficiency","radio",3,["Sufficient","Requires interpreter"]),
    *sig_decl(4),
],
"45160002-rideshare-driver-authorisation.pdf": [
    *person_fields(1), *contact_fields(1),
    *addr_fields(2),
    f("Driver Licence Number","driver_licence_number","text",2),
    f("Vehicle Registration","vehicle_registration","text",2),
    f("Rideshare Platform","rideshare_platform","radio",3,["Uber","DiDi","Ola","Other"]),
    f("Working With Children Check Number","working_with_children_check","text",3,req=False),
    *sig_decl(3),
],
"45160003-bus-operator-accreditation.pdf": [
    f("Operator Name","operator_name","text",1), f("ABN","abn","text",1),
    *addr_fields(1),
    f("Contact Name","contact_name","text",2), *contact_fields(2),
    f("Number of Vehicles","number_of_vehicles","number",2),
    f("Accreditation Type","accreditation_type","radio",3,["Regular passenger service","Tourist and charter","School bus","Community transport"]),
    f("Route Description","route_description","textarea",3,req=False),
    *sig_decl(4),
],

# ── Vehicle Registration ───────────────────────────────────────────────────────
"45170001-vehicle-registration-application.pdf": [
    f("Owner Surname","owner_surname","text",1), f("Owner Given Names","owner_given_names","text",1),
    f("Date of Birth","date_of_birth","date",1), *contact_fields(1),
    *addr_fields(2),
    f("Vehicle Identification Number (VIN)","vehicle_identification_number","text",2),
    f("Vehicle Make","vehicle_make","text",2),
    f("Vehicle Model","vehicle_model","text",3), f("Year of Manufacture","vehicle_year","number",3),
    f("Vehicle Colour","vehicle_colour","text",3),
    f("Vehicle Type","vehicle_type","dropdown",3,["Sedan","Hatchback","SUV","Ute","Van","Truck","Motorcycle","Other"]),
    f("Engine Number","engine_number","text",3),
    f("Registration Period","registration_period","radio",4,["3 months","6 months","12 months"]),
    *sig_decl(4),
],
"45170002-registration-transfer.pdf": [
    f("Seller Surname","seller_surname","text",1), f("Seller Given Names","seller_given_names","text",1),
    f("Seller Phone","seller_phone","text",1),
    f("Buyer Surname","buyer_surname","text",2), f("Buyer Given Names","buyer_given_names","text",2),
    f("Buyer Date of Birth","buyer_date_of_birth","date",2),
    f("Buyer Phone","buyer_phone","text",2), f("Buyer Email","buyer_email","text",2),
    f("Registration Plate","vehicle_registration_plate","text",3),
    f("Vehicle Identification Number (VIN)","vehicle_identification_number","text",3),
    f("Transfer Date","transfer_date","date",3), f("Odometer Reading (km)","odometer_reading","number",3),
    f("Seller Declaration","seller_declaration","checkbox",4),
    f("Buyer Declaration","buyer_declaration","checkbox",4),
    f("Seller Signature","seller_signature","signature",4),
    f("Buyer Signature","buyer_signature","signature",4),
],
"45170003-registration-cancellation.pdf": [
    f("Owner Surname","owner_surname","text",1), f("Owner Given Names","owner_given_names","text",1),
    f("Registration Plate","vehicle_registration_plate","text",1), f("Date of Birth","date_of_birth","date",1),
    *addr_fields(2), *contact_fields(2),
    f("Reason for Cancellation","reason_for_cancellation","radio",3,["Sold","Written off","Exported","No longer required"]),
    f("Cancellation Date","cancellation_date","date",3),
    *sig_decl(3),
],
"45170004-conditional-registration.pdf": [
    f("Owner Surname","owner_surname","text",1), f("Owner Given Names","owner_given_names","text",1),
    f("Date of Birth","date_of_birth","date",1), *contact_fields(1),
    *addr_fields(2),
    f("Vehicle Identification Number (VIN)","vehicle_identification_number","text",2),
    f("Vehicle Description","vehicle_description","textarea",2),
    f("Conditional Use","conditional_use","radio",3,["Vintage/Historic","Racing","Farm vehicle","Special purpose"]),
    f("Permitted Routes","permitted_routes","textarea",3),
    *sig_decl(3),
],
"45170005-historic-vehicle-registration.pdf": [
    f("Owner Surname","owner_surname","text",1), f("Owner Given Names","owner_given_names","text",1),
    f("Date of Birth","date_of_birth","date",1), f("Club Name","club_name","text",1,req=False),
    *addr_fields(2), *contact_fields(2),
    f("Vehicle Identification Number (VIN)","vehicle_identification_number","text",2),
    f("Vehicle Make","vehicle_make","text",3), f("Vehicle Model","vehicle_model","text",3),
    f("Year of Manufacture","vehicle_year","number",3), f("Vehicle Colour","vehicle_colour","text",3),
    f("Original Engine?","original_engine","radio",3,["Yes","No – modified"]),
    f("Restoration Details","restoration_details","textarea",3,req=False),
    *sig_decl(4),
],

# ── VSCCS ─────────────────────────────────────────────────────────────────────
"45180001-vsccs-application.pdf": [
    f("Applicant Name","applicant_name","text",1), f("ABN","abn","text",1),
    *addr_fields(1),
    f("Contact Name","contact_name","text",2), *contact_fields(2),
    f("Vehicle Category","vehicle_category","dropdown",2,["Passenger car","Light goods","Heavy goods","Motorcycle","Trailer"]),
    f("Modification Type","modification_type","textarea",3),
    f("Compliance Standard","compliance_standard","text",3),
    f("Engineer Name","engineer_name","text",3),
    f("Engineer Registration Number","engineer_registration_number","text",3),
    *sig_decl(4),
],
"45180002-vehicle-modification-approval.pdf": [
    f("Owner Surname","owner_surname","text",1), f("Owner Given Names","owner_given_names","text",1),
    *contact_fields(1),
    f("Registration Plate","vehicle_registration_plate","text",2),
    f("Vehicle Identification Number (VIN)","vehicle_identification_number","text",2),
    f("Vehicle Make","vehicle_make","text",2), f("Vehicle Model","vehicle_model","text",2),
    f("Year of Manufacture","vehicle_year","number",2),
    f("Modification Description","modification_description","textarea",3),
    f("Modification Type","modification_type","radio",3,["Engine","Suspension","Body","Brakes","Lighting","Other"]),
    f("Engineer Name","engineer_name","text",3), f("Engineer Phone","engineer_phone","text",3),
    *sig_decl(4),
],
"45180003-compliance-plate-application.pdf": [
    f("Manufacturer Name","manufacturer_name","text",1), f("ABN","abn","text",1),
    *addr_fields(1),
    f("Contact Name","contact_name","text",2), *contact_fields(2),
    f("Vehicle Category","vehicle_category","dropdown",2,["Passenger car","Light goods","Heavy goods","Motorcycle","Trailer"]),
    f("Model Name","model_name","text",2),
    f("Compliance Standard","compliance_standard","text",3),
    f("Approval Number","approval_number","text",3),
    f("Production Volume","production_volume","number",3),
    f("Number of Plates Requested","plate_quantity_requested","number",3),
    *sig_decl(4),
],

# ── Driving Instructor Licence (real form from data) ──────────────────────────
"45061655-driving-instructor-licence-app.pdf": [
    *person_fields(1),
    f("Gender","gender","radio",1,["Male","Female","Non-binary","Prefer not to say"]),
    *addr_fields(2), *contact_fields(2),
    f("Current Driver Licence Number","current_driver_licence_number","text",2),
    f("Licence Class","licence_class","dropdown",3,["C – Car","R – Motorcycle","Both"]),
    f("Years Licensed","years_licenced","number",3),
    f("First Aid Certificate","first_aid_certificate","radio",3,["Yes","No"]),
    *sig_decl(4),
],
"45061574-internal-review-of-a-decision.pdf": [
    f("Full Name","full_name","text",1), *contact_fields(1),
    f("Decision Date","decision_date","date",1),
    f("Reference Number","reference_number","text",1,req=False),
    f("Decision Reviewed","decision_reviewed","textarea",2),
    f("Grounds for Review","grounds_for_review","textarea",2),
    f("Preferred Outcome","preferred_outcome","textarea",3,req=False),
    *sig_decl(3),
],
"45072014-application-for-vessel-registration.pdf": [
    f("Owner Surname","owner_surname","text",1), f("Owner Given Names","owner_given_names","text",1),
    f("Date of Birth","date_of_birth","date",1), *contact_fields(1),
    *addr_fields(2),
    f("Vessel Name","vessel_name","text",2),
    f("Vessel Type","vessel_type","dropdown",2,["Motor vessel","Sailing vessel","Personal watercraft","Canoe/kayak","Rowing boat","Other"]),
    f("Hull Material","hull_material","radio",3,["Fibreglass","Aluminium","Timber","Steel","Inflatable"]),
    f("Hull Colour","hull_colour","text",3),
    f("Engine Power (kW)","engine_power","number",3,req=False),
    *sig_decl(4),
],
"45072015-application-transfer-vessel-registration.pdf": [
    f("Current Owner Surname","current_owner_surname","text",1),
    f("Current Owner Given Names","current_owner_given_names","text",1),
    f("Current Owner Phone","current_owner_phone","text",1),
    f("New Owner Surname","new_owner_surname","text",2),
    f("New Owner Given Names","new_owner_given_names","text",2),
    f("New Owner Date of Birth","new_owner_dob","date",2),
    f("New Owner Phone","new_owner_phone","text",2),
    f("New Owner Email","new_owner_email","text",2),
    f("Vessel Registration Number","vessel_registration_number","text",3),
    f("Vessel Name","vessel_name","text",3),
    f("Transfer Date","transfer_date","date",3),
    f("Sale Price ($)","sale_price","number",3),
    f("Current Owner Signature","current_owner_signature","signature",4),
    f("New Owner Signature","new_owner_signature","signature",4),
],
}

out_path = os.path.join(os.path.dirname(__file__), "data", "final_fields.json")
with open(out_path, "w") as fh:
    json.dump(forms, fh, indent=2)

print(f"Written {len(forms)} forms to {out_path}")
for k,v in forms.items():
    print(f"  {k}: {len(v)} fields")
