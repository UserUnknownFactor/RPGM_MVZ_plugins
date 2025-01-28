# -*- coding: utf-8 -*-
import re, time, os, io, sys, binascii
import hashlib
from PIL import Image

pathSysJSON = "www\\data\\System.json"
pathSysJSON1 = "data\\System.json"
pathRpgProject = "www\\Game.rpgproject"

RE_ENC_KEY_CUE = re.compile(r'encryptionKey"\s*:\s*"([^"]+)"')
ARTENC_HEADER = b'ART\0ENCRYPTER100FREE\0VERSION\0\0\0\0'
PNG_HEADER = b'\x89PNG\r\n\x1a\n\0\0\0\rIHDR'
OVERWRITE_FILES = True
DECRYPT_MUSIC = False
DECRYPT_VIDEOS = True

def transform_encryption_key(key):
    md5_hash = bytearray(hashlib.md5(binascii.hexlify(key)).digest())
    for i in range(len(md5_hash) - 1, -1, -1):
        md5_hash.append(md5_hash[i])
    return md5_hash

def encrypt_ae(data, key):
    transformed_key = transform_encryption_key(key)
    return xor(data, transformed_key)

def decrypt_ae(data, key):
    return encrypt_ae(data, key)

def xor(source, key):
    if not key or len(key) == 0:
        return source
    l = len(key)
    return bytearray(((source[i] ^ key[i % l]) for i in range(0, len(source))))

def short_path(fn, begin=32, end=32):
    return fn[:begin] + "..." + fn[-end:];

def findKey(sysJsonPath):
    key = ''
    if not os.path.exists(sysJsonPath):
        return key
    with open(sysJsonPath, "r", encoding="utf-8") as gf:
        key = RE_ENC_KEY_CUE.search(gf.read())
        if key and key.group(1):
            key = key.group(1)
        if not key: return bytearray()
    return bytearray(binascii.unhexlify(key)) 

def decryptFilename(encryptedFilename): 
    if encryptedFilename.endswith(".rpgmvo"): return encryptedFilename[:-7] + ".ogg"
    elif encryptedFilename.endswith(".rpgmvm"): return encryptedFilename[:-7] + ".m4a" 
    elif encryptedFilename.endswith(".rpgmvp"): return encryptedFilename[:-7] + ".png" 
    elif encryptedFilename.endswith(".ogg_"): return encryptedFilename[:-5] + ".ogg" 
    elif encryptedFilename.endswith(".png_"): return encryptedFilename[:-5] + ".png" 
    return encryptedFilename

def isEncryptedFile(path): 
    if path.endswith(".rpgmvp"): return True
    elif path.endswith(".png_"): return True
    elif DECRYPT_MUSIC and path.endswith(".ogg_"): return True
    elif DECRYPT_MUSIC and path.endswith(".rpgmvo"): return True
    elif DECRYPT_VIDEOS and path.endswith(".rpgmvm"): return True
    return False

def is_valid_png(bytes_data):
    try:
        Image.open(bytes_data).verify()
        bytes_data.seek(0)
        return True
    except:
        return False

def decryptFile(encryptedFilename, key, root_path = None, output_path=""): 
    dfn = decryptFilename(encryptedFilename)
    is_png = dfn.endswith(".png")

    if root_path and output_path is not None:
        dfn = dfn.replace(root_path, os.path.join(root_path, output_path))

    if OVERWRITE_FILES or not os.path.isfile(dfn):
        file_header = PNG_HEADER if is_png else None
        with open(encryptedFilename, "rb") as f:
            data = f.read(16)
            if data == ARTENC_HEADER[:16]:
                data = f.read(16)
                file_header = decrypt_ae(f.read(32), key)
            elif key:
                file_header = xor(f.read(16), key)
            else:
                f.read(16)
            if is_png and file_header[:16] != PNG_HEADER:
                print(f"{file_header} !== {PNG_HEADER}")
                #file_header = b''
            if file_header:
                file_bytes = io.BytesIO(file_header + f.read())
                if is_png:
                    if is_valid_png(file_bytes):
                        with open(dfn,"wb") as fo:
                            fo.write(file_bytes.getbuffer())
                    else:
                        print(f"Unparsable PNG data in {encryptedFilename}")
                else:
                    with open(dfn,"wb") as fo:
                        fo.write(file_bytes.getbuffer())

# main
command_line = (len(sys.argv) > 1)
if not command_line:
    import tkinter
    from tkinter import filedialog, messagebox, ttk

    window = tkinter.Tk()
    window.title('RPG Maker MV/MZ File Decryptor')
    window.geometry("500x100")
    window.resizable(0, 0)
    window.eval('tk::PlaceWindow %s center' % window.winfo_toplevel())
    progressbar = ttk.Progressbar(window, orient ="horizontal", length = 460, mode ="indeterminate")
    progressbar.pack(fill='x', padx=15, pady=15)
    v = tkinter.StringVar()
    v.set("Ready...")
    label = tkinter.Label(window, textvariable=v)
    label.pack(expand=True)

    root_dir = filedialog.askdirectory(title="Please select game directory (with the main executable)").replace("/", os.sep) + os.sep
    noWWW = False
    wwwpath = os.path.join(root_dir, pathSysJSON)
    nowwwpath = os.path.join(root_dir, pathSysJSON1)
    if root_dir and (os.path.exists(wwwpath) or os.path.exists(nowwwpath)):
        key = findKey(wwwpath)
        if len(key) < 2:
            key = findKey(nowwwpath)
            noWWW = True
        if len(key) < 2:
            progressbar.destroy()
            v.set(f"ERROR: Could not find decryption key! Paths:\n{wwwpath},\n{nowwwpath}.")
            window.update()
        else:
            www_dir = root_dir if noWWW else os.path.join(root_dir, "www")
            for path, dirs, files in os.walk(www_dir):
                progressbar["value"] = 0
                for f in files:
                    progressbar["maximum"] = len(files)
                    fn = os.path.join(path,f)
                    truncated = short_path(fn) if len(fn) > 67 else fn
                    progressbar.step(1)
                    window.update()
                    if isEncryptedFile(fn):
                        v.set("Decrypting: " + truncated.replace('/','\\'))
                        decryptFile(fn, key)
            progressbar.destroy()
            v.set("DONE! Game has been decrypted... Set hasEncryptedImages and hasEncryptedAudio\n to false in System.json to use unpacked files.")
            window.update()
    else:
        progressbar.destroy()
        v.set("ERROR: Could not find System.json.\nCheck if the game directory is correct: " + root_dir.replace('/','\\'))
        window.update()

    time.sleep(5)
else:
    noWWW = False
    root_dir = sys.argv[1].strip('"')
    wwwpath = os.path.join(root_dir, pathSysJSON)
    nowwwpath = os.path.join(root_dir, pathSysJSON1)
    outpath = sys.argv[2].strip('"') if len(sys.argv) > 2 else None
    print('RPG Maker MV File Decryptor')
    print(f"Path is {os.path.abspath(root_dir)}")
    key = findKey(wwwpath)
    if len(key) < 2:
        key = findKey(nowwwpath)
        noWWW = True
    if len(key) < 2:
        print("ERROR: Could not find decryption key in System.json, using default PNG header.")
    print("Processing files...")
    www_dir = root_dir if noWWW else os.path.join(root_dir, "www")
    for path, dirs, files in os.walk(www_dir):
        for f in files:
            fn = os.path.join(path, f)
            if isEncryptedFile(fn):
                truncated = short_path(fn) if len(fn) > 67 else fn
                print(" " * 80 + '\r', end='', flush=True)
                print(" " + truncated.replace('/','\\') + '\r', end='', flush=True)
                decryptFile(fn, key)

    print(" " * 80 + '\r', end='', flush=True)
    print("DONE! Game has been decrypted...")
