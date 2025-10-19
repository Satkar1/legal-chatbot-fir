from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from datetime import datetime
import os


def generate_fir_pdf(fir_data):
    """Generate FIR PDF in official structured format with proper description spacing"""

    # Directory setup
    fir_number = fir_data['fir_number']
    year = fir_number.split('/')[1]
    month = int(fir_number.split('/')[2])
    month_name = datetime(2000, month, 1).strftime('%B')

    dir_path = f"fir_drafts/{year}/{month:02d}_{month_name}"
    os.makedirs(dir_path, exist_ok=True)

    filename = f"{fir_number.replace('/', '_')}.pdf"
    filepath = os.path.join(dir_path, filename)

    # Create Document
    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = ParagraphStyle(
        'FIRTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0d47a1'),
        alignment=1,
        spaceAfter=20
    )

    header_style = ParagraphStyle(
        'Header',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#b71c1c'),
        spaceBefore=10,
        spaceAfter=8,
        underlineWidth=1
    )

    content_style = ParagraphStyle(
        'Content',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )

    story = []

    # Optional: Add Police Logo (if available)
    logo_path = "static/logo.png"
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=60, height=60)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 10))

    # Title
    story.append(Paragraph("<b>FIRST INFORMATION REPORT (FIR)</b>", title_style))
    story.append(Spacer(1, 10))

    # === FIR Header Info ===
    fir_info = [
        ["FIR Number", fir_data['fir_number']],
        ["Date & Time", datetime.now().strftime("%d/%m/%Y %H:%M")],
        ["Police Station", fir_data['police_station']],
        ["District", fir_data['district']],
        ["State", fir_data['state']]
    ]

    fir_table = Table(fir_info, colWidths=[120, 350])
    fir_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(fir_table)
    story.append(Spacer(1, 15))

    # === INCIDENT DETAILS ===
    story.append(Paragraph("INCIDENT DETAILS", header_style))

    inc = fir_data['incident_details']

    # Table part (without description)
    incident_data = [
        ["Type of Incident", inc['type']],
        ["Date of Incident", inc['date']],
        ["Time of Incident", inc['time']],
        ["Location", inc['location']],
    ]

    incident_table = Table(incident_data, colWidths=[120, 350])
    incident_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(incident_table)
    story.append(Spacer(1, 5))

    # Description as a separate paragraph block
    story.append(Paragraph("<b>Description:</b>", content_style))
    story.append(Paragraph(inc['description'], content_style))
    story.append(Spacer(1, 15))

    # === VICTIM INFORMATION ===
    story.append(Paragraph("VICTIM INFORMATION", header_style))
    vic = fir_data['victim_info']
    victim_data = [
        ["Name", vic['name']],
        ["Contact", vic['contact']],
        ["Address", vic['address']],
        ["Age", str(vic.get('age', ''))],
        ["Gender", vic.get('gender', '')],
    ]

    victim_table = Table(victim_data, colWidths=[120, 350])
    victim_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(victim_table)
    story.append(Spacer(1, 15))

    # === ACCUSED INFO ===
    acc = fir_data['accused_info']
    if acc.get('name'):
        story.append(Paragraph("ACCUSED INFORMATION", header_style))
        accused_data = [
            ["Name", acc['name']],
            ["Description", acc['description']],
        ]
        accused_table = Table(accused_data, colWidths=[120, 350])
        accused_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(accused_table)
        story.append(Spacer(1, 15))

    # === LEGAL SECTIONS ===
    story.append(Paragraph("LEGAL SECTIONS APPLIED", header_style))
    if fir_data['sections_applied']:
        sections = [
            [f"IPC Section {s.get('section_number', '')}: {s.get('section_title', '')}"]
            for s in fir_data['sections_applied']
        ]
        sec_table = Table(sections, colWidths=[470])
        sec_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(sec_table)
    else:
        story.append(Paragraph("No specific sections applied", content_style))

    story.append(Spacer(1, 15))

    # === OFFICER INFO ===
    story.append(Paragraph("INVESTIGATING OFFICER", header_style))
    story.append(Paragraph(fir_data['investigating_officer'], content_style))
    story.append(Spacer(1, 25))

    # === SIGNATURE AREA ===
    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>Signature of Officer:</b> ____________________________", content_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Date:</b> ____________________________", content_style))

    # Build PDF
    doc.build(story)
    return filepath
