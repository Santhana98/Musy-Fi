function suggest_jsonp(url, callback) {
    var callbackName = 'suggest_' + Math.round(100000 * Math.random());

    window[callbackName] = function(data) {
        delete window[callbackName]
        document.body.removeChild(script)
        callback(data)
    }

    const script = document.createElement('script')
    script.src = `${url}${url.indexOf('?') >= 0 ? '&' : '?'}&callback=${callbackName}`
    document.body.appendChild(script)
}

var accordionOpener = document.querySelectorAll('.opener')

if (accordionOpener.length) {
    for (c = 0; c < accordionOpener.length; c++) {
        accordionOpener[c].addEventListener('click', function() {
            var e = this.nextElementSibling, d = e.style.display;
            e.style.display = d == '' || d == 'none' ? 'block' : 'none';
        });
    }
}

if (document.querySelector('input[name=q]')) {
    var suggestResults = document.querySelector('.suggest-results');

    document.querySelector('input[name=q]').addEventListener('keyup', function(e) {
        var keywords = [];

        if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
            if (!suggestResults.classList.contains('hidden')) {
                var active = suggestResults.querySelector('li.active');
                var done = false;

                if (!active) {
                    suggestResults.querySelector('li:first-child').classList.add('active');
                } else if (e.code === 'ArrowUp' && active.previousElementSibling || e.code === 'ArrowDown' && active.nextElementSibling) {
                    active.classList.remove('active');

                    if (e.code === 'ArrowUp' && active.previousElementSibling) {
                        active.previousElementSibling.classList.add('active');
                    } else {
                        active.nextElementSibling.classList.add('active');
                    }

                    document.querySelector('input[name=q]').value = suggestResults.querySelector('li.active').textContent;
                } else {
                    done = true
                }

                if (!done) {
                    suggestResults.querySelector('.active').scrollIntoView({ block: 'nearest' });
                }
            }
        } else {
            suggest_jsonp(`https://suggestqueries.google.com/complete/search?q=${e.target.value}&hl=us&client=youtube-reduced&ds=yt&callback=ytmp3`, function(data) {
                if (data?.[1] && data[1].length) {
                    keywords.push(...data[1].map(i => i[0]));

                    suggestResults.innerHTML = '';

                    if (keywords.length) {
                        suggestResults.classList.remove('hidden');

                        for (const keyword of keywords) {
                            suggestResults.innerHTML += `<li>${keyword}</li>`;
                        }
                    } else {
                        suggestResults.classList.add('hidden');
                    }

                    suggestResults.querySelectorAll('li').forEach(function(el) {
                        el.addEventListener('mousedown', function(e) {
                            e.preventDefault();
                            suggestResults.classList.add('hidden');
                            document.querySelector('input[name=q]').value = el.textContent;
                            document.querySelector('form').submit();
                        });
                    });
                } else {
                    suggestResults.classList.add('hidden');
                }
            })
        }
    })

    document.querySelector('input[name=q]').addEventListener('focus', function() {
        if (suggestResults.querySelectorAll('li').length && suggestResults.classList.contains('hidden')) {
            suggestResults.classList.remove('hidden');
        }
    });

    document.querySelector('input[name=q]').addEventListener('blur', function() {
        if (!suggestResults.classList.contains('hidden')) {
            suggestResults.classList.add('hidden');
        }
    });
}

if (document.querySelector('#ajax-results')) {
    fetch(location.href, { method: 'POST' }).then(function(response) {
        return response.json();
    }).then(function(response) {
        var html = '<div class="search-list">';

        for (var i = 0; i < response.length; i++) {
            html += '<div data-id="' + response[i]['id'] + '">';
            html += '<div class="primary">';
            html += '<img src="' + response[i]['image_url'] + '" alt="' + response[i]['title'] + '">';
            html += '<div class="info">';
            html += '<h2 title="' + response[i]['title'] + '">' + response[i]['title'] + '</h2>';
          html += '<button type="button" class="download-btn"><a href="' + convert_url + '?id=' + response[i]['id'] + '" style="color:white;text-decoration: none;">Download</a></button>';
            html += '<button type="button" class="play-btn">Play</button>';
            html += '</div>';
            html += '</div>';
            html += '<div class="iframe"></div>';
            html += '</div>';
        }

        html += '</div>';

        document.querySelector('#ajax-results').innerHTML = html;

        document.querySelectorAll('.search-list div[data-id]').forEach(function(el) {
            var id = el.getAttribute('data-id');

            el.querySelector('.play-btn').addEventListener('click', function(e) {
                e.preventDefault();

                if (el.classList.contains('active')) {
                    return;
                }

                if (document.querySelector('.search-list .active')) {
                    document.querySelector('.search-list .active .iframe').innerHTML = '';
                }

                el.classList.add('active')
                el.querySelector('.iframe').innerHTML = '<div style="position:relative;margin-top:1rem;padding-bottom:56.25%;overflow:hidden;-webkit-border-radius:4px;border-radius:4px;"><iframe src="https://www.youtube.com/embed/' + id + '?autoplay=1" scrolling="no" frameborder="0" marginwidth="0" marginheight="0" allowtransparency="yes" autoplay style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>';
            });
        });
    });
}
