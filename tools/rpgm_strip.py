import json, io, logging, re, sys
from pathlib import Path
from enum import Enum

# Logging setup
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(message)s'))
logger.addHandler(handler)

# Define enums for resource types
class ResourceTypeImage(Enum):
    ANIMATIONS = 'animations'
    BATTLEBACK1 = 'battlebacks1'
    BATTLEBACK2 = 'battlebacks2'
    CHARACTERS = 'characters'
    ENEMIES = 'enemies'
    FACES = 'faces'
    PARALLAX = 'parallaxes'
    PICTURES = 'pictures'
    SV_ACTORS = 'sv_actors'
    SV_ENEMIES = 'sv_enemies'
    TILESETS = 'tilesets'
    TITLES1 = 'titles1'
    TITLES2 = 'titles2'

class ResourceTypeAudio(Enum):
    BGM = 'bgm'
    BGS = 'bgs'
    ME = 'me'
    SE = 'se'

class SetEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return dict(__set=list(obj))
        else:
            return json.JSONEncoder.default(self, obj)

    @staticmethod
    def as_set(dct):
        """ decoded = json.loads(encoded, object_hook=json_as_python_set)
            json set: {'__set': [1,2,3]} to set([1,2,3])
        """
        if '__set' in dct:
            return set(dct['__set'])
        return dct

# Global dictionaries to store resource usage
tileset_map = {}
animation_map = {}
image_keep_map = {resource_type.value: set() for resource_type in ResourceTypeImage}
audio_keep_map = {resource_type.value: set() for resource_type in ResourceTypeAudio}

def register_image_keep(resource_name, resource_type):
    logger.debug(f"Inserting {resource_name} {resource_type}...")
    if resource_name:
        image_keep_map[resource_type.value].add(resource_name)

def register_audio_keep(resource_name, resource_type):
    logger.debug(f"Inserting {resource_name} {resource_type}...")
    if resource_name:
        audio_keep_map[resource_type.value].add(resource_name)

def parse_tileset_map(tilesets):
    logger.debug("Parsing tilesets...")
    for tileset in tilesets:
        if not tileset: continue
        for map_name in tileset["tilesetNames"]:
            if map_name not in tileset_map.get(tileset["id"], []):
                tileset_map.setdefault(tileset["id"], []).append(map_name)

def parse_animations(data):
    logger.debug("Parsing animations...")
    for anim in data:
        if anim:
            register_animation(anim['id'], anim['animation1Name'])
            register_animation(anim['id'], anim['animation2Name'])
            for item in anim['timings']:
                if item['se']:
                    register_animation(anim['id'], item['se']['name'], 'se')

def register_animation(index, animation_name, anim_type='img'):
    if animation_name:
        animation_map.setdefault(index, {'img': [], 'se': []})[anim_type].append(animation_name)

# Function to parse commands and register resource usage
def parse_command(command, check_scripts):
    code = command["code"]
    parameters = command["parameters"]

    if code == 245:  # Play BGS
        register_audio_keep(parameters[0]["name"], ResourceTypeAudio.BGS)
    elif code == 241:  # Play BGM
        register_audio_keep(parameters[0]["name"], ResourceTypeAudio.BGM)
    elif code == 249:  # Play ME
        register_audio_keep(parameters[0]["name"], ResourceTypeAudio.ME)
    elif code == 250:  # Play SE
        register_audio_keep(parameters[0]["name"], ResourceTypeAudio.SE)
    elif code == 132:  # Change Battle BGM
        register_audio_keep(parameters[0]["name"], ResourceTypeAudio.BGM)
    elif code == 133:  # Change Victory ME
        register_audio_keep(parameters[0]["name"], ResourceTypeAudio.ME)
    elif code == 139:  # Change Defeat ME
        register_audio_keep(parameters[0]["name"], ResourceTypeAudio.ME)
    elif code == 140:  # Change Vehicle BGM
        register_audio_keep(parameters[1]["name"], ResourceTypeAudio.BGM)
    elif code == 323:  # Vehicle Image Change
        register_image_keep(parameters[1], ResourceTypeImage.CHARACTERS)
    elif code == 322:  # Character Image Change
        register_image_keep(parameters[1], ResourceTypeImage.FACES)
        register_image_keep(parameters[3], ResourceTypeImage.CHARACTERS)
        register_image_keep(parameters[5], ResourceTypeImage.SV_ACTORS)
    elif code == 284:  # Parallax Change
        register_image_keep(parameters[0], ResourceTypeImage.PARALLAX)
    elif code == 283:  # Battleback Change
        register_image_keep(parameters[0], ResourceTypeImage.BATTLEBACK1)
        register_image_keep(parameters[1], ResourceTypeImage.BATTLEBACK2)
    elif code == 231:  # Show Picture
        if parameters[1] == "test":
            pass
        register_image_keep(parameters[1], ResourceTypeImage.PICTURES)
    elif code == 282:  # Change Tileset
        tileset_id = parameters[0]
        if tileset_id in tileset_map:
            for key in tileset_map[tileset_id]:
                register_image_keep(key, ResourceTypeImage.TILESETS)
    elif code in (337, 212):  # Show Battle Animation / Show Animation
        anim_id = parameters[2] if code == 337 else parameters[1]
        if anim_id in animation_map:
            for file_se in animation_map[anim_id]['se']:
                register_audio_keep(file_se, ResourceTypeAudio.SE)
            for file_img in animation_map[anim_id]['img']:
                register_image_keep(file_img, ResourceTypeImage.ANIMATIONS)
    elif check_scripts and code in (356, 355):  # MV Script
        result = re.search(r"([\"\'])((?:\\\1|.)*?)\1", parameters[0])
        if result:
            result = result.group(2)
            register_image_keep(result, ResourceTypeImage.PICTURES)
            register_audio_keep(result, ResourceTypeAudio.BGS)
            register_audio_keep(result, ResourceTypeAudio.SE)
    elif check_scripts and code == 357:  # MZ Script
        if len(parameters) >= 4:
            pass # TODO: needs a specific parameters for each

def parse_events(data, check_scripts=False):
    logger.debug(f"Parsing common events...")
    for event in data['events']:
        if not event: continue
        for page in event['pages']:
            image_char_index = page['image'].get('characterName', None)
            if image_char_index:
                register_image_keep(image_char_index, ResourceTypeImage.CHARACTERS)
            for command in page['list']:
                parse_command(command, check_scripts)

def parse_common_events(data, check_scripts=False):
    logger.debug("Parsing common events...")
    for c_event in data:
        if not c_event: continue
        [parse_command(command, check_scripts) for command in c_event['list']]

def parse_map(data):
    register_image_keep(data["battleback1Name"], ResourceTypeImage.BATTLEBACK1)
    register_image_keep(data["battleback2Name"], ResourceTypeImage.BATTLEBACK2)
    register_image_keep(data["parallaxName"], ResourceTypeImage.PARALLAX)
    register_audio_keep(data["bgs"]["name"], ResourceTypeAudio.BGS)
    register_audio_keep(data["bgm"]["name"], ResourceTypeAudio.BGM)
    tileset_id = data["tilesetId"]
    if tileset_id in tileset_map:
        for key in tileset_map[tileset_id]:
            register_image_keep(key, ResourceTypeImage.TILESETS)

def parse_system(data):
    logger.debug("Parsing system...")
    register_image_keep(data['battleback1Name'], ResourceTypeImage.BATTLEBACK1)
    register_image_keep(data['battleback2Name'], ResourceTypeImage.BATTLEBACK2)
    register_image_keep(data['battlerName'], ResourceTypeImage.SV_ACTORS)
    register_image_keep(data['title1Name'], ResourceTypeImage.TITLES1)
    register_image_keep(data['title2Name'], ResourceTypeImage.TITLES2)
    register_audio_keep(data['titleBgm']['name'], ResourceTypeAudio.BGM)
    register_audio_keep(data['battleBgm']['name'], ResourceTypeAudio.BGM)
    register_audio_keep(data['defeatMe']['name'], ResourceTypeAudio.ME)
    register_audio_keep(data['gameoverMe']['name'], ResourceTypeAudio.ME)
    register_audio_keep(data['victoryMe']['name'], ResourceTypeAudio.ME)
    register_audio_keep(data['airship']['bgm']['name'], ResourceTypeAudio.BGM)
    register_image_keep(data['airship']['characterName'], ResourceTypeImage.CHARACTERS)
    register_audio_keep(data['boat']['bgm']['name'], ResourceTypeAudio.BGM)
    register_image_keep(data['boat']['characterName'], ResourceTypeImage.CHARACTERS)
    register_audio_keep(data['ship']['bgm']['name'], ResourceTypeAudio.BGM)
    register_image_keep(data['ship']['characterName'], ResourceTypeImage.CHARACTERS)
    for sound in data['sounds']:
        register_audio_keep(sound['name'], ResourceTypeAudio.SE)

def parse_actors(data):
    logger.debug("Parsing actors...")
    for actor in data:
        if not actor: continue
        register_image_keep(actor['characterName'], ResourceTypeImage.CHARACTERS)
        register_image_keep(actor['faceName'], ResourceTypeImage.FACES)
        register_image_keep(actor['battlerName'], ResourceTypeImage.SV_ACTORS)

def parse_enemies(data):
    logger.debug("Parsing enemies...")
    for enemy in data:
        if not enemy: continue
        register_image_keep(enemy['battlerName'], ResourceTypeImage.SV_ENEMIES)
        register_image_keep(enemy['battlerName'], ResourceTypeImage.ENEMIES)

def parse_data_for_animations(data):
    logger.debug("Parsing animations...")
    for item in data:
        if not item: continue
        anim_id = item['animationId']
        if anim_id >= 1:
            for file_se in animation_map[anim_id]['se']:
                register_audio_keep(file_se, ResourceTypeAudio.SE)
            for file_img in animation_map[anim_id]['img']:
                register_image_keep(file_img, ResourceTypeImage.ANIMATIONS)

def list_rpgm_files(project_path, json_prefix='rtp', save=False):
    logger.debug(f"Loading RPG MV/MZ data...")
    all_rtp_img = {resource_type.value: set() for resource_type in ResourceTypeImage}
    all_rtp_audio = {resource_type.value: set() for resource_type in ResourceTypeAudio}

    imgdir = project_path.absolute() / 'img'
    audiodir = project_path.absolute() / 'audio'

    for subdir in all_rtp_img:
        cur_dir = imgdir / subdir
        if not cur_dir.is_dir(): continue
        for f in cur_dir.iterdir():
            if f.is_file() and f.stem not in all_rtp_img[subdir]:
                all_rtp_img[subdir].add(f.stem)

    for subdir in all_rtp_audio:
        cur_dir = audiodir / subdir
        if not cur_dir.is_dir(): continue
        for f in (audiodir / subdir).iterdir():
            if f.is_file() and f.stem not in all_rtp_audio[subdir]:
                all_rtp_audio[subdir].add(f.stem)

    if save:
        with open(f'{json_prefix}_imgs_list.json', 'w', encoding='utf-8') as f:
            json.dump(all_rtp_img, f, indent=2, cls=SetEncoder)

        with open(f'{json_prefix}_audio_list.json', 'w', encoding='utf-8') as f:
            json.dump(all_rtp_audio, f, indent=2, cls=SetEncoder)

    return all_rtp_img, all_rtp_audio

def load_rtp_list(json_prefix='rtp'):
    logger.debug(f"Loading RPG MV/MZ RTP data...")
    imgs_to_delete = {}
    audio_to_delete = {}
    try:
        with open(f'{json_prefix}_imgs_list.json', 'r', encoding='utf-8') as f:
            imgs_to_delete = json.load(f, object_hook=SetEncoder.as_set)
    except FileNotFoundError:
        pass
    try:
        with open(f'{json_prefix}_audio_list.json', 'r', encoding='utf-8') as f:
            audio_to_delete = json.load(f, object_hook=SetEncoder.as_set)
    except FileNotFoundError:
        pass
    return imgs_to_delete, audio_to_delete

# Function to physically move unused resource files to a "removed" directory
def remove_files(remove_dict, base_path, base_remove_path):
    logger.debug(f"Moving unused RPG MV/MZ files...")
    rdir = Path(base_remove_path)
    for _, dir_items in remove_dict.items():
        for file_basename in dir_items:
            for filename in Path(base_path).rglob(f'{file_basename}.*'):
                new_path = rdir / filename.relative_to(base_path)
                new_path.parent.mkdir(parents=True, exist_ok=True)
                filename.rename(rdir / filename.relative_to(base_path))

def scan_js_files(project_path, imgs_to_delete, audio_to_delete):
    js_folder = project_path / 'js'
    if not js_folder.is_dir():
        return

    for js_file in js_folder.rglob('*.js'):
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                for img_type, img_names in imgs_to_delete.items():
                    for img_name in list(img_names):
                        if img_name in content:
                            imgs_to_delete[img_type].discard(img_name)
                for audio_type, audio_names in audio_to_delete.items():
                    for audio_name in list(audio_names):
                        if audio_name in content:
                            audio_to_delete[audio_type].discard(audio_name)
        except Exception as e:
            logger.error(f"Error reading or processing {js_file}: {e}")


def run_parser(project_path, exclude_folders=None, strip_only_rtp=True, check_scripts=False, test_orphans=False, print_removed=False):
    project_path = Path(project_path)
    if not project_path.is_dir():
        logger.error(f'Directory "{project_path}" not found, check your input path (-i parameter)')
        return False
    data_path = project_path / "data"
    if not data_path.is_dir():
        logger.error(f'Directory "{data_path}" not found, check your input path (-i parameter)')
        return False

    # Parse game data files
    # NOTE: Some games don't use Armors/Items/Animations/etc you can reset them
    #      manually (to [ null ] for lists and to {} for dicts) in the JSONs beforehand.
    parse_tileset_map(json.loads((data_path / "Tilesets.json").read_text(encoding='utf-8')))
    parse_animations(json.loads((data_path / "Animations.json").read_text(encoding='utf-8')))
    parse_system(json.loads((data_path / "System.json").read_text(encoding='utf-8')))
    parse_enemies(json.loads((data_path / "Enemies.json").read_text(encoding='utf-8')))
    parse_actors(json.loads((data_path / "Actors.json").read_text(encoding='utf-8')))
    parse_common_events(json.loads((data_path / "CommonEvents.json").read_text(encoding='utf-8')), check_scripts)
    parse_data_for_animations(json.loads((data_path / "Skills.json").read_text(encoding='utf-8')))
    parse_data_for_animations(json.loads((data_path / "Items.json").read_text(encoding='utf-8')))
    parse_data_for_animations(json.loads((data_path / "Weapons.json").read_text(encoding='utf-8')))

    logger.debug("Parsing map info and tiles...")
    for map_file in data_path.glob('Map*'):
        if re.match(r'Map\d+\b', map_file.stem):
            data = json.loads(map_file.read_text(encoding='utf-8'))
            if not isinstance(data, dict):
                logger.error(f"{data} is not a dict in {map_file.stem}")
                return False
            data.pop('data', None)
            parse_map(data)
            parse_events(data, check_scripts)

    # Load or generate resource removal lists
    imgs_from_rtp, audio_from_rtp = load_rtp_list()
    imgs_to_delete, audio_to_delete = list_rpgm_files(project_path)

    # Exclude specified folders from removal
    for folder in exclude_folders:
        imgs_to_delete.pop(folder, None)
        audio_to_delete.pop(folder, None)

    def keep_unused(base: dict, keep: dict, rtp: dict):
        result = dict(base)
        for key, dir_items in base.items():
            keep_set = keep.get(key, set())
            if test_orphans:
                missing_set = keep_set - (dir_items & keep_set)
                if missing_set:
                    missing_str = '\n'.join(missing_set)
                    print(f"{key} items declared, but not on disk: \n{missing_str}")
            if strip_only_rtp:
                keep_set = keep_set & rtp.get(key, set())
            diff_set = dir_items & keep_set
            result[key] =  dir_items - diff_set
        return result

    # Scan JS files for resource usage since they can access the images
    if check_scripts:
        scan_js_files(project_path, imgs_to_delete, audio_to_delete)

    if test_orphans:
        print('======== Orphan references ========')

    # Remove used resources from removal lists
    imgs_to_delete = keep_unused(imgs_to_delete, image_keep_map, imgs_from_rtp)
    audio_to_delete = keep_unused(audio_to_delete, audio_keep_map, audio_from_rtp)

    if test_orphans:
        return False
    if print_removed:
        print('======== Images to delete ========')
        for key, dir_items in imgs_to_delete.items():
            if dir_items: 
                print(f'==== Directory {project_path / key} ====')
                for i in sorted(dir_items):
                    print(i)
        print('======== Audio to delete ========')
        for key, dir_items in audio_to_delete.items():
            if dir_items: 
                print(f'==== Directory {project_path / key} ====')
                for i in sorted(dir_items):
                    print(i)
        return False

    # Move unused resource files
    remove_files(imgs_to_delete, project_path / 'img', project_path / 'removed' / 'img')
    remove_files(audio_to_delete, project_path / 'audio', project_path / 'removed' / 'audio')

    return True

if __name__ == '__main__':
    import argparse, os

    self_name = os.path.basename(__file__)
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawTextHelpFormatter,
        description=(
'Scans and strips an RPG Maker game of unused files.\n'
'They are moved to the "removed" folder in the project directory.\n'
'\n'
'usage examples:\n'
f'  {self_name} --input-directory "." -p\n'
f'  {self_name} -i "www" -e "pictures,bgm" -p\n'
f'  {self_name} -s -p\n'
f'  {self_name} -i "NewData" -g\n'
        )
    )
    def comma_separated(string: str):
        if string:
            return [i.strip() for i in string.split(',') if i]
        return []
    parser.add_argument('-i', '--input-directory', type=Path, default='www', help='Path to the RPG Maker project directory (default: www)') #, required=True) # if we omit default=
    parser.add_argument('-e', '--exclude-folders', type=comma_separated, nargs='+', default=[], help='Comma-separated list of folders to exclude from stripping', metavar='DIRECTORY,')
    parser.add_argument('-s', '--strip-only-rtp', action='store_true', help='Strip only RTP resources, otherwise everything unused')
    parser.add_argument('-c', '--check-scripts-not', action='store_true', help="Don't check script commands and .js files for resources (naive approach)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('-o', '--orphans-list', action='store_true', help='Find resources declared in JSONs but missing on disk')
    group.add_argument('-t', '--test-parse-jsons', action='store_true', help='Only print unused game resources to the console')
    group.add_argument('-g', '--generate-lists', action='store_true', help='Generate JSON resource lists (to dump file lists of RPGM RTP)')
    group.add_argument('-p', '--parse-jsons', action='store_true', help='Run stripping of the unused game resources')

    args = parser.parse_args(args=None if sys.argv[1:] else ['--help'])

    if args.generate_lists:
        list_rpgm_files(args.input_directory, save=True)
        print('Resource JSON files generated successfully.')
    elif run_parser(
            args.input_directory, 
            args.exclude_folders, 
            args.strip_only_rtp, 
            not args.check_scripts_not, 
            args.orphans_list,
            args.test_parse_jsons):
        print('Unused resources moved to the "removed" folder.')

