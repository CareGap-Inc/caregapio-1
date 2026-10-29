// Copy buttons for code examples: <button data-copy-target="<pre id>">.
// Announces the result through #copy-status for screen readers.
(function () {
    'use strict';
    var status = document.getElementById('copy-status');

    function announce(button, text) {
        button.textContent = text;
        if (status) status.textContent = text;
        setTimeout(function () { button.textContent = 'Copy'; }, 2000);
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-copy-target]'), function (button) {
        button.addEventListener('click', function () {
            var target = document.getElementById(button.getAttribute('data-copy-target'));
            if (!target) return;
            var text = target.innerText;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(
                    function () { announce(button, 'Copied'); },
                    function () { announce(button, 'Press Ctrl+C to copy'); selectText(target); }
                );
            } else {
                selectText(target);
                announce(button, 'Press Ctrl+C to copy');
            }
        });
    });

    function selectText(node) {
        var range = document.createRange();
        range.selectNodeContents(node);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
})();
