import FreeSimpleGUI as sg
import PIL.Image
import PIL.ImageDraw
import io
import os

def convert_to_bytes(img):
    """Convert PIL image to bytes for PySimpleGUI"""
    bio = io.BytesIO()
    img.save(bio, format='PNG')
    return bio.getvalue()

def draw_icon_border_on_image(sheet, icon_x, icon_y, color='red', width=2):
    """Draw a border around an icon at the specified grid position directly on the image"""
    x = icon_x * ICON_SIZE
    y = icon_y * ICON_SIZE
    draw = PIL.ImageDraw.Draw(sheet)
    draw.rectangle([x, y, x + ICON_SIZE, y + ICON_SIZE], outline=color, width=width)
    return sheet

def load_iconset(path):
    try:
        return PIL.Image.open(path)
    except:
        return None

def main():
    global ICON_SIZE
    ICON_SIZE = 32
    ICONS_PER_ROW = 16
    ICONS_PER_COLUMN = 16
    TOTAL_ICONS = ICONS_PER_ROW * ICONS_PER_COLUMN

    # Default path for RPG Maker MV IconSet
    default_path = os.path.join('.', 'www', 'img', 'system', 'IconSet.png')

    # Try to load the default path first
    sheet = None
    if os.path.exists(default_path):
        sheet = load_iconset(default_path)
        icon_path = default_path

    # If default path doesn't exist or failed to load, show file dialog
    if sheet is None:
        file_layout = [
            [sg.Text('IconSet Path:')],
            [sg.Input(default_text=default_path, key='-PATH-', size=(50, 1)), 
             sg.FileBrowse(initial_folder=os.path.dirname(default_path), 
                          file_types=(('PNG Files', '*.png'),))],
            [sg.Button('Load'), sg.Button('Cancel')]
        ]

        file_window = sg.Window('Select IconSet', file_layout)
        event, values = file_window.read()
        file_window.close()

        if event in (sg.WIN_CLOSED, 'Cancel'):
            return

        icon_path = values['-PATH-']
        sheet = load_iconset(icon_path)

        if sheet is None:
            sg.popup_error(f'Error: Could not load {icon_path}')
            return

    current_icon = 0
    current_x = current_y = 0

    screen_height = sg.Window.get_screen_size()[1]
    max_height = min(sheet.height, screen_height - 200)

    # Pre-render the red square on the initial icon
    sheet_with_border = draw_icon_border_on_image(sheet.copy(), current_x, current_y)

    layout = [
        [sg.Column([
            [sg.Graph(
                canvas_size=(sheet.width, sheet.height),
                graph_bottom_left=(0, sheet.height),
                graph_top_right=(sheet.width, 0),
                key='-GRAPH-',
                enable_events=True,
                drag_submits=True
            )],
        ], scrollable=True, vertical_scroll_only=True, size=(sheet.width + 20, max_height), key='-COL-')],
        [sg.Text('Current Icon:', size=(12, 1)), 
         sg.Text('0', key='-CURRENT-', size=(6, 1))],
        [sg.Text('Use arrow keys or click to select icons')]
    ]

    window = sg.Window('RPG Maker MV Icon Viewer', layout, return_keyboard_events=True, finalize=True)

    graph = window['-GRAPH-']
    column = window['-COL-']

    # Display the initial pre-rendered image (with the red square)
    graph.draw_image(data=convert_to_bytes(sheet_with_border), location=(0, 0))

    def update_image_with_square(icon_x, icon_y):
        """Update the image using the pre-rendered square and draw it at the new position"""
        graph.erase()
        updated_image = draw_icon_border_on_image(sheet.copy(), icon_x, icon_y)
        graph.draw_image(data=convert_to_bytes(updated_image), location=(0, 0))

    while True:
        event, values = window.read()

        if event == sg.WIN_CLOSED:
            break

        old_x, old_y = current_x, current_y

        if event == '-GRAPH-':  # Click event
            x, y = values['-GRAPH-']

            # Determine the icon grid position from absolute coordinates
            icon_x = int(x) // ICON_SIZE
            icon_y = int(y) // ICON_SIZE

            if 0 <= icon_x < ICONS_PER_ROW and 0 <= icon_y < sheet.height // ICON_SIZE:
                current_icon = icon_y * ICONS_PER_ROW + icon_x
                current_x, current_y = icon_x, icon_y

        elif event.startswith('Left'):
            current_icon = max(0, current_icon - 1)
        elif event.startswith('Right'):
            current_icon = min(TOTAL_ICONS - 1, current_icon + 1)
        elif event.startswith('Up'):
            current_icon = max(0, current_icon - ICONS_PER_ROW)
        elif event.startswith('Down'):
            current_icon = min(TOTAL_ICONS - 1, current_icon + ICONS_PER_ROW)

        # Update current position from icon number
        current_x = current_icon % ICONS_PER_ROW
        current_y = current_icon // ICONS_PER_ROW

        # Move the pre-rendered image with a red square if the position changes
        if (old_x, old_y) != (current_x, current_y):
            update_image_with_square(current_x, current_y)
            window['-CURRENT-'].update(str(current_icon))

    window.close()

if __name__ == '__main__':
    main()