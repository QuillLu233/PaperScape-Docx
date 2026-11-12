from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from PIL import Image, ImageDraw
from pathlib import Path

root = Path(__file__).resolve().parents[1]
fixture = root / 'docs' / 'fixtures'
fixture.mkdir(parents=True, exist_ok=True)
image_path = fixture / 'phase5-sample-image.png'
image = Image.new('RGB', (320, 160), '#e8dfcd')
draw = ImageDraw.Draw(image)
for x in range(320):
    color = (30 + x // 8, 70 + x // 5, 55 + x // 10)
    draw.line((x, 0, x, 160), fill=color)
draw.rectangle((18, 18, 302, 142), outline='#f7f1e4', width=3)
draw.text((42, 70), 'PaperScape DOCX', fill='#f7f1e4')
image.save(image_path)

doc = Document()
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)

title = doc.add_heading('PaperScape DOCX Roundtrip', level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_heading('第一章 中文标题', level=1)
doc.add_heading('English Heading H2', level=2)

p = doc.add_paragraph()
p.add_run('中文普通段落，含 ')
p.add_run('粗体内容').bold = True
p.add_run(' 与 ')
p.add_run('斜体内容').italic = True
p.add_run('，以及 English mixed text.')

p2 = doc.add_paragraph('居中段落：这一行用于检查段落对齐。')
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER

doc.add_paragraph('无序列表项目一', style='List Bullet')
doc.add_paragraph('无序列表项目二', style='List Bullet')
doc.add_paragraph('有序列表第一项', style='List Number')
doc.add_paragraph('有序列表第二项', style='List Number')

table = doc.add_table(rows=2, cols=3)
table.style = 'Table Grid'
table.alignment = WD_TABLE_ALIGNMENT.CENTER
headers = ['列 A', '列 B', '列 C']
for index, text in enumerate(headers):
    table.cell(0, index).text = text
for index, text in enumerate(['中文单元格', 'Bold cell', '第三格']):
    table.cell(1, index).text = text

doc.add_paragraph('图片：')
doc.add_picture(str(image_path), width=Cm(8))

doc.save(fixture / 'phase5-sample.docx')
print('created', fixture / 'phase5-sample.docx')
