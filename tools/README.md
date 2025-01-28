## Various RPGM MV/MZ Python tools

* **run_server.py**: Runs local HTTP server from a folder.
* **rpgm_enc.py**: Encodes images to their encrypted format.
* **rpgm_dec.py**: Decodes images from their encrypted format.
* **rpgm_strip.py**: Strips unused assets (images/audio) form RPGM games (the JSONs are RTP lists for it). 
* **show_icon_id**: Shows id of an icon on the standard RPGM IconSet.png (decrypted; requires FreeSimpleGui). 
* **fix_wrapping.py**: Merges consequent lines of a single messages and splits them again based on their pixel/character lengths.
* **collapse_wrapping.py**: Collapses multi-line messages into single liners for ease of in-file translating (additionally merges in any empty 401's).
* **VE_SFont.py**: Renders raster fonts for VE_SFont JS plugin from normal fonts.