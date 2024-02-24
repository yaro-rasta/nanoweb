(() => {
    function read(args) {
        const url = args.value[args.field];
        const [uri, id] = url.split(':');
        const dir = args['data']?.['all']?.[uri]?.['directory'] || [];
        
        // Assuming the filtering logic is corrected and unnecessary static assignment is removed.
        const filteredItems = dir.filter(el => ('' + el.id).startsWith(id));
        
        // Flat map the files from the filtered items
        const files = filteredItems.flatMap(el => el.files || []);

        return {
            files // This will return an object with a property 'files' that is an array of file paths
        };
    }
    window.nwType['nwFileSection'] = {
        read
    }
})();
