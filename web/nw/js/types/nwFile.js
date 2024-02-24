(() => {
    const escape = window.nwEscapeHTML;
    function href(value, args) {
        if ('string' === typeof value) {
            return value;
        }
        if (value['$src']) {
            return value['$src'];
        }
        if (value['$ref']) {
            const { files } = window.nwFileSection.read({ ...args, field: '$ref', value });
            if (!files.length) {
                return false;
            }
            return href(files[0], args);
        }
        return false;
    }
    function last(value, divider = '/') {
        const chunks = value.split(divider);
        return chunks[chunks.length - 1];
    }
    function setText(value, $text, $ext = null, $div = null) {
        if ('string' === typeof value) {
            $text.innerText = last(value);
            if ($ext) $ext.innerText = last(value, '.');
            return true;
        } else if (value['src']) {
            return setText(value['name'] || last(value['src']), $text, $ext, $div);
        } else if (value['$ref']) {
            const { files } = window.nwFileSection.read({ ...args, field: '$ref', value });
            return setText(files[0], $text, $ext, $div);
        } else if (value['text']) {
            return setText(value['text'], $text);
        }
        return false;
    }
    /**
     * Creates a Bootstrap-styled form group with label and input.
     * 
     * @param {string} labelText - The text for the label.
     * @param {object} inputAttrs - Attributes for the input element (e.g., type, id).
     * @param {string} groupId - Optional. ID for the group div, useful for specific styling or targeting.
     * @returns {HTMLElement} The div element containing the label and input.
     */
    function createBootstrapInputGroup(labelText, attrs = {}) {
        const $group = document.createElement('div');
        $group.classList.add('mb-3');
        Object.keys(attrs['group'] || {}).forEach(key => {
            $group.setAttribute(key, attrs['group'][key]);
        });

        const $label = document.createElement('label');
        $label.innerText = labelText;
        $label.classList.add('form-label');
        Object.keys(attrs['label'] || {}).forEach(key => {
            $label.setAttribute(key, attrs['label'][key]);
        });
        if (attrs['input']?.['id']) $label.setAttribute('for', attrs['input']?.['id']);

        const $input = document.createElement('input');
        $input.classList.add('form-control');
        Object.keys(attrs['input'] || {}).forEach(key => {
            $input.setAttribute(key, attrs['input'][key]);
        });

        $group.appendChild($label);
        $group.appendChild($input);

        return { $group, $label, $input };
    }

    /**
     * Generated DOM for the read version.
     * @param {object} args 
     * @returns HTML
     *          <div value="{${args.data[args.field]}">
     *            <label>${rule['nwFile']?.['title']}</table>
     *            <a href="href(value, args)">
     *               <span>${text}</span>
     *               <span class="ext">${ext}</span>
     *            </a>
     */
    function read(args) {
        const { rule } = args;
        const value = args.data[args.field];
        const $div = document.createElement('div');
        $div.classList.add('value');
        const $label = document.createElement('label');
        $label.innerText = rule['nwFile']?.['title'];
        $div.appendChild($label);
        const $link = document.createElement('a');
        const $icon = document.createElement(i);
        $icon.setAttribute('class', 'nwi-download');
        $link.append($icon);
        const $text = document.createElement('span');
        $link.append($text);
        const url = href(value, args);
        const $ext = document.createElement('span');
        $ext.setAttribute('class', 'ext');
        $link.append($ext);
        $div.appendChild($link);
        if (false === url) {
            $text.innerText = 'ERR';
            $text.setAttribute('class', 'alert alert-danger');
        } else {
            $text.setAttribute('class', '');
            $link.setAttribute('href', url);
            setText(value, $text, $ext, $div);
        }
        return $div;
    }
    function edit(args, event) {
        const { data, field, options } = args;
        const value = data[field] || {};
        const $div = document.createElement('div');
        $div.classList.add('container');
    
        // Using the utility function to create input groups
        const { $group: $srcGroup } = createBootstrapInputGroup(
            'Source or Reference',
            {
                input: {
                    type: 'text', 
                    id: 'srcInput', 
                    value: value['$src'] || value['$ref'] || ''
                }
            });
        const { $group: $nameGroup } = createBootstrapInputGroup(
            'Name',
            {
                input: {
                    type: 'text', 
                    id: 'nameInput', 
                    value: value['name'] || ''
                }
            });
        const { $group: $textGroup } = createBootstrapInputGroup(
            'Text',
            {
                input: {
                    type: 'text', 
                    id: 'textInput', 
                    value: value['text'] || '' 
                }
            });
        const { $group: $fileGroup, $input: $fileInput } = createBootstrapInputGroup(
            options['single'] ? 'Upload file' : 'Upload files',
            {
                group: { class: 'mb-3 drag-drop-area' },
                input: {
                    type: 'file',
                    id: 'fileInput',
                    multiple: !Boolean(options['single']),
                    class: 'form-control d-none'
                }
            }
        );
    
        // Append created groups to the main div
        $div.appendChild($srcGroup);
        $div.appendChild($nameGroup);
        $div.appendChild($textGroup);

        // Custom drop zone
        const $dropZone = document.createElement('div');
        $dropZone.classList.add('drop-zone', 'border', 'rounded', 'd-flex', 'justify-content-center', 'align-items-center', 'p-3');
        $dropZone.innerText = 'Drag and drop files here or click to select files';
        $dropZone.style.height = '12rem'; // Customize height as needed
        $dropZone.style.cursor = 'pointer';

        // Click on drop zone to trigger file input
        $dropZone.addEventListener('click', () => $fileInput.click());

        // Drag and drop events
        $dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            $dropZone.classList.add('drop-zone-over');
        });

        $dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            $dropZone.classList.remove('drop-zone-over');
        });

        $dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            $dropZone.classList.remove('drop-zone-over');
            if (e.dataTransfer.files.length) {
                $fileInput.files = e.dataTransfer.files;
                // Display selected file names or handle files as needed
                updateFileList(e.dataTransfer.files);
            }
        });

        // Change event for file input for selecting files traditionally
        $fileInput.addEventListener('change', () => {
            if ($fileInput.files.length) {
                // Display selected file names or handle files as needed
                updateFileList($fileInput.files);
            }
        });

        function updateFileList(files) {
            // Example function to update the list of selected/uploaded files
            const fileList = document.createElement('ul');
            fileList.classList.add('list-unstyled');
            Array.from(files).forEach(file => {
                const fileItem = document.createElement('li');
                fileItem.innerText = file.name;
                fileList.appendChild(fileItem);
            });
            // Clear previous list and add new
            $fileGroup.querySelectorAll('ul').forEach(ul => ul.remove());
            $fileGroup.appendChild(fileList);
        }

        $fileGroup.appendChild($dropZone);

        // Append the file upload group to the main div
        $div.appendChild($fileGroup);    
        return $div;
    }
    
    if (!window.nwType['nwFile']) window.nwType['nwFile'] = {};
    window.nwType['nwFile'] = {
        read,
        edit,
    }
})();