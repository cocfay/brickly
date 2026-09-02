import { useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';

import {
    ClassicEditor,
    Bold,
    Essentials,
    Italic,
    Underline,
    Paragraph,
    List,
    PasteFromOffice,
    Plugin,
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

// Plugin de autocapitalización: mayúscula al inicio, tras punto y tras salto de línea
class AutoCapitalize extends Plugin {
    init() {
        const editor = this.editor;
        editor.editing.view.document.on('keydown', (evt, data) => {
            // Ignorar si se presiona Ctrl o Meta (Cmd) - permitir Ctrl+V, Ctrl+C, etc.
            if (data.domEvent.ctrlKey || data.domEvent.metaKey) return;

            // Solo letras (a-z con acentos)
            if (!data.domEvent.key || data.domEvent.key.length !== 1 || !/[a-záéíóúüñ]/i.test(data.domEvent.key)) return;

            const model = editor.model;
            const selection = model.document.selection;
            const position = selection.getFirstPosition();
            if (!position) return;

            // Obtener el texto antes del cursor en el bloque actual
            const block = position.parent;
            let textBefore = '';
            for (const child of block.getChildren()) {
                if (child.is('$text')) {
                    const childOffset = child.startOffset ?? 0;
                    if (childOffset < position.offset) {
                        textBefore += child.data.slice(0, position.offset - childOffset);
                    }
                }
            }

            const trimmed = textBefore.trimEnd();
            const shouldCapitalize =
                trimmed === '' ||               // inicio del bloque (cubre Enter también)
                /[.!?]\s*$/.test(trimmed);      // tras punto, ! o ?

            if (shouldCapitalize) {
                const upper = data.domEvent.key.toUpperCase();
                if (upper !== data.domEvent.key) {
                    data.domEvent.preventDefault();
                    evt.stop();
                    editor.model.change(writer => {
                        editor.model.insertContent(writer.createText(upper));
                    });
                }
            }
        }, { priority: 'high' });
    }
}

function MyTextEditor({ value = '', onChange }) {
    const editorRef = useRef(null);
    const prevValueRef = useRef(value);

    // Sincroniza el contenido del editor SOLO cuando el valor cambia desde afuera
    // (ej. al cargar datos en modo edición), y no por la propia edición del usuario.
    useEffect(() => {
        if (editorRef.current && value !== prevValueRef.current) {
            if (editorRef.current.getData() !== value) {
                editorRef.current.setData(value);
            }
            prevValueRef.current = value;
        }
    }, [value]);

    return (
        <div>
            <CKEditor
                editor={ClassicEditor}
                data={value}
                onReady={(editor) => {
                    editorRef.current = editor;
                    prevValueRef.current = value;
                }}
                onChange={(event, editor) => {
                    const data = editor.getData();
                    prevValueRef.current = data;
                    if (onChange) onChange(data);
                }}
                config={{
                    licenseKey: 'GPL',
                    plugins: [
                        Essentials,
                        Paragraph,
                        Bold,
                        Italic,
                        Underline,
                        List,
                        PasteFromOffice,
                        AutoCapitalize,
                    ],
                    toolbar: [
                        'bold', 'italic', 'underline', '|',
                        'bulletedList', 'numberedList'
                    ],
                    language: 'es'
                }}
            />
        </div>
    );
}

export default MyTextEditor;
