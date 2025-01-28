# -*- coding: utf-8 -*-
import re, time, tkinter, sys, os, binascii
from tkinter import filedialog, messagebox, ttk

pathSysJSON = "www\\data\\System.json"
pathSysJSON1 = "data\\System.json"
encryptKeyCue = r'encryptionKey"\s*:\s*"([^"]+)"'
pathRpgProject = "www\\Game.rpgproject"
mvFileHeader = "52 50 47 4D 56 00 00 00 00 03 01 00 00 00 00 00"

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
        key = re.search(encryptKeyCue, gf.read())
        if key and key.group(1):
            key = key.group(1)
        if not key: return bytearray()
    return bytearray(binascii.unhexlify(key))

def makeFilename(enc_file_name, mz=False):
    if not mz:
        if enc_file_name.endswith(".ogg"): return enc_file_name[:-4] + ".rpgmvo"
        elif enc_file_name.endswith(".m4a"): return enc_file_name[:-4] + ".rpgmvm"
        elif enc_file_name.endswith(".png"): return enc_file_name[:-4] + ".rpgmvp"
    else:
        if enc_file_name.endswith(".ogg"): return encryptedFilename[:-4] + ".ogg_" 
        elif enc_file_name.endswith(".png"): return encryptedFilename[:-4] + ".png_" 

def makeDirs(filename):
    pathOut = os.path.dirname(filename)
    if pathOut != '' and not os.path.exists(pathOut):
        os.makedirs(pathOut, exist_ok=True)

def isEncryptableFile(path):
    if path.endswith(".ogg"): return True
    if path.endswith(".m4a"): return True
    if path.endswith(".png"): return True
    return False

def encryptFile(enc_file_name, key, root_path = None, output_path="translated"):
    with open(enc_file_name, "rb") as f:
        mvheader = bytearray(binascii.unhexlify(mvFileHeader.replace(' ', '')))
        data = f.read()
        plaintext = bytearray(data[:16])
        cyphertext = xor(plaintext, key)
        data = data[16:]
        if root_path and output_path:
            enc_file_name = enc_file_name.replace(root_path, os.path.join(root_path, output_path))
            makeDirs(enc_file_name)
        with open(makeFilename(enc_file_name),"wb") as fo:
            fo.write(mvheader)
            fo.write(cyphertext)
            fo.write(data)

# main
command_line = (len(sys.argv) > 1)
if not command_line:
    window = tkinter.Tk()
    window.title('RPG Maker MV/MZ File Encryptor')
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
            v.set(f"ERROR: Could not find encryption key! Paths:\n{wwwpath},\n{nowwwpath}.")
            window.update()
        else:
            www_dir = root_dir if noWWW else os.path.join(root_dir, "www")
            for path, dirs, files in os.walk(www_dir):
                progressbar["value"] = 0
                for f in files:
                    progressbar["maximum"] = len(files)
                    fn = os.path.join(path,f)
                    if len(fn) > 67:
                        truncated = short_path(fn)
                    else:
                        truncated = fn
                    progressbar.step(1)
                    window.update()
                    if isEncryptableFile(fn):
                        v.set("Encrypting: " + truncated.replace('/','\\'))
                        encryptFile(fn, key)
            progressbar.destroy()
            v.set("DONE! Game has been encrypted... Set hasEncryptedImages and hasEncryptedAudio\n to true in System.json to use packed files.")
            window.update()
    else:
        progressbar.destroy()
        v.set("ERROR: Could not find System.json.\nCheck if the game directory is correct: " + root_dir.replace('/','\\'))
        window.update()
    time.sleep(5)
else:
    root_dir = os.path.realpath(sys.argv[1].strip('"'))
    outpath = sys.argv[2].strip('"') if len(sys.argv) > 2 else None
    print('RPG Maker MV File Encryptor')
    print(f"Path is {root_dir}")
    _json_path = os.path.join(root_dir, pathSysJSON)
    noWWW = False
    wwwpath = os.path.join(root_dir, pathSysJSON)
    nowwwpath = os.path.join(root_dir, pathSysJSON1)
    if os.path.isfile(wwwpath) or os.path.isfile(nowwwpath):
        key = findKey(wwwpath)
        if len(key) < 2:
            key = findKey(nowwwpath)
            noWWW = True
        if len(key) < 2:
            print("ERROR: Could not find encryption key in System.json.")
        else:
            print("Processing files...")
            www_dir = root_dir if noWWW else os.path.join(root_dir, "www")
            for path, dirs, files in os.walk(www_dir):
                for f in files:
                    fn = os.path.join(path, f)
                    if len(fn) > 67:
                        truncated = short_path(fn)
                    else:
                        truncated = fn
                    if isEncryptableFile(fn):
                        print(" " * 80 + '\r', end='', flush=True)
                        print(" " + truncated.replace('/','\\') + '\r', end='', flush=True)
                        encryptFile(fn, key, root_dir, outpath)
            print(" " * 80 + '\r', end='', flush=True)
            print("DONE! Game has been encrypted...\n  Set hasEncryptedImages and hasEncryptedAudio\n  to true in System.json to use packed files.")
    else:
        print(f"ERROR: File {_json_path} doesn't exist.")
