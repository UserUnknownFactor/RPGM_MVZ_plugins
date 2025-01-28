import os
from PIL import Image, ImageDraw, ImageFont

def generate_sfont(
    font_path, 
    font_size, 
    output_path, 
    characters= "!\"#$%&'()+,-./0123456789:;<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~", 
    marker_color=(255, 0, 255),  # Pink marker color
    font_color=(255, 255, 255),  # Font color (white)
    outline_color=(0, 0, 0),     # Outline color (black)
    spacing=5                    # Spacing between characters
):
    """
    Generates a bitmap sprite font (SFont) with pink markers only in spacing areas.
    """
    # Load the font
    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception as e:
        print(f"Error loading font: {e}")
        return

    # Get font metrics
    ascent, descent = font.getmetrics()
    
    # First pass: measure all characters
    total_width = 0
    char_metrics = []
    
    for char in characters:
        bbox = font.getbbox(char)
        width = bbox[2] - bbox[0] + 2  # Add small padding
        total_width += width + spacing
        char_metrics.append({
            'width': width,
            'bbox': bbox
        })

    # Calculate total height needed
    total_height = ascent + descent + 4  # Add padding for outline

    # Create the sprite sheet image with transparency
    sheet = Image.new("RGBA", (total_width + 1, total_height + 1), (0, 0, 0, 0))  # +1 for marker row
    draw = ImageDraw.Draw(sheet)

    # Set the skip color in the top-left pixel (0,0)
    sheet.putpixel((0, 0), marker_color)

    def draw_text_with_outline(draw, x, y, text, font, outline_color, text_color):
        # Draw outline
        for adj_x in [-1, 1]:
            for adj_y in [-1, 1]:
                draw.text((x + adj_x, y + adj_y), text, font=font, fill=outline_color)
        # Draw text
        draw.text((x, y), text, font=font, fill=text_color)

    # Generate metadata
    metadata = {}
    x_offset = 0

    # Calculate baseline position
    baseline_y = ascent + 1  # +1 for marker row

    for i, char in enumerate(characters):
        metrics = char_metrics[i]
        width = metrics['width']
        bbox = metrics['bbox']
        
        # Draw the character with outline
        draw_text_with_outline(
            draw,
            x_offset - bbox[0] + 1,  # Add small left padding
            baseline_y - ascent,     # Align to baseline
            char,
            font,
            outline_color,
            font_color
        )

        # Mark only the spacing with pink
        for x in range(x_offset + width, x_offset + width + spacing):
            if x < total_width:
                sheet.putpixel((x, 0), marker_color)

        # Store metadata
        metadata[char] = {
            "x": x_offset,
            "y": 1,
            "width": width,
            "height": total_height
        }

        x_offset += width + spacing

    # Save the sprite sheet
    os.makedirs(output_path, exist_ok=True)
    sprite_sheet_path = os.path.join(output_path, "sfont.png")
    sheet.save(sprite_sheet_path)
    print(f"Sprite sheet saved to: {sprite_sheet_path}")

    # Save the metadata
    metadata_path = os.path.join(output_path, "sfont_metadata.txt")
    with open(metadata_path, "w") as meta_file:
        for char, data in metadata.items():
            meta_file.write(f"{char}: {data}\n")
    print(f"Metadata saved to: {metadata_path}")

if __name__ == "__main__":
    generate_sfont(
        font_path="arial.ttf",   # Path to your .ttf font file
        font_size=26,            # Font size
        output_path="output",    # Output directory
        marker_color=(255, 0, 255),  # Pink marker color
        font_color=(255, 255, 255),  # White text
        outline_color=(0, 0, 0),     # Black outline
        spacing=8                # Spacing between characters
    )