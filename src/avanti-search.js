/*!
 * Avanti Search - v1.2.4 - 2017-08-12
 * https://github.com/avanti/avantisearch
 * Licensed MIT
 */

;(function ($) {
  var AvantiSearch = {
    //  _       _ _
    // (_)_ __ (_) |_
    // | | '_ \| | __|
    // | | | | | | |_
    // |_|_| |_|_|\__|
    //

    init: function ($result, settings) {
      var self = this;

      self.options = $.extend(self.getDefaultOptions(), settings);
      self.options.$result = $result;

      self.start();
      self.bind();
    },

    start: function () {
      var self = this;

      self._createButtons();

      self.request = self._setRequest();
      self._concatRequest();
      self._setPaginationInfo();

      self.options.pagination && self._setPaginationWrap();

      self.checkAndStart();
    },

    _createButtons: function () {
      var self = this;

      $('.resultItemsWrapper div[id^=ResultItems]')
        .before('<button class="'+ self.options.classLoadLess +' '+ self.options.classLoadBtnHide +'">'+ self.options.textLoadLess +'</button>')
        .after('<button class="'+ self.options.classLoadMore +'">'+ self.options.textLoadMore +'</button>');
    },

    _setPaginationWrap: function () {
      var self = this;

      var $pagination = $('<div />', {
        class: self.options.classPagination
      });

      self.options.$resultItemsWrapper.append($pagination);
    },


    //       _               _
    //   ___| |__   ___  ___| | __
    //  / __| '_ \ / _ \/ __| |/ /
    // | (__| | | |  __/ (__|   <
    //  \___|_| |_|\___|\___|_|\_\
    //

    checkAndStart: function () {
      var self = this;

      self._checkRequestWithCookie() ?
        self.startWithCookie() : self.startWithoutCookie();

      self.options.$result.trigger('avantisearch.init', [ self.options, self.request ]);
    },

    _checkRequestWithCookie: function () {
      var self = this;

      if (typeof Cookies === 'undefined') {
        throw new Error('You need install this plugin https://github.com/js-cookie/js-cookie');

        return false;
      }

      var hash = parseInt(window.location.hash.substr(1));
      var cookie = Cookies.get(self.options.cookieName);

      var localQuery = $.extend({}, self.request.query);
      localQuery.PageNumber = hash;

      return (
        !isNaN(hash) &&
        typeof cookie !== 'undefined' &&
        JSON.stringify(localQuery) === JSON.stringify(JSON.parse(cookie))
      );
    },


    //      _             _
    //  ___| |_ __ _ _ __| |_
    // / __| __/ _` | '__| __|
    // \__ \ || (_| | |  | |_
    // |___/\__\__,_|_|   \__|
    //

    startWithCookie: function () {
      var self = this;

      self._setParamsFromCookie();
      self._applyCookieParams();

      self._getTotalItems(function (totalItems) {
        self.options.totalItems = parseInt(totalItems);
        self.options.$totalItems.text(totalItems);
        self.options.totalPages = self._getTotalPages();

        self._checkAndLoadWithCookie();
      })
    },

    _checkAndLoadWithCookie: function () {
      var self = this;

      var pageNumber = self.request.query.PageNumber;
      var totalPages = self.options.totalPages;

      self.options.$result.trigger('avantisearch.initWithCookie', [ self.options, self.request ]);

      if (self.options.pagination) {
        self._startPagination();
        self.load('html', pageNumber, function () {
          self._showItems(pageNumber);
        });

        return false;
      }

      if (pageNumber === totalPages && pageNumber !== 1) {
        self._showButton(self.options.classLoadLess);
        self._hideButton(self.options.classLoadMore);

        self.load('html', pageNumber, function () {
          self._showItems(pageNumber);

          self.load('prepend', pageNumber - 1);
        });

      } else if (pageNumber === 1) {
        self._startFirst(pageNumber, totalPages === 1 ? false : true);

      } else if (pageNumber > 1) {
        self._showButton(self.options.classLoadMore);
        self._showButton(self.options.classLoadLess);

        self.load('html', pageNumber, function () {
          self._setUrlHash(pageNumber);
          self._showItems(pageNumber);

          self.load('append', pageNumber + 1, function () {
            self.load('prepend', pageNumber - 1, function () {
              self.request.query.PageNumber = pageNumber;
              self._concatRequest();
              self._saveCookie();
            });
          });
        });
      }
    },

    _startFirst: function (pageNumber, startSecond, callback) {
      var self = this;

      if (typeof startSecond === 'undefined') {
        startSecond = true;
      }

      self._hideButton(self.options.classLoadLess);

      self.load('html', pageNumber, function () {
        self._showItems(pageNumber);
        self._saveCookie();

        if (startSecond) {
          self.load('append', pageNumber + 1, function () {
            self._showButton(self.options.classLoadMore);

            typeof callback !== 'undefined' && callback();
          });

        } else {
          self._hideButton(self.options.classLoadMore);

          typeof callback !== 'undefined' && callback();
        }
      });
    },

    startWithoutCookie: function () {
      var self = this;

      self._checkDefaultParams() && self._setDefaultParams();

      self.options.$result.find('> div > ul > li')
        .attr('page', 1)
        .removeClass('last first');

      self._setUrlHash(1);
      self._saveCookie();

      if (self.options.pagination) {
        self._startPagination();

        return false;
      }

      self.load('append', 2);
    },

    _startPagination: function () {
      var self = this;

      self._hideButton(self.options.classLoadMore);
      self._disableButton(self.options.classLoadMore);

      self._hideButton(self.options.classLoadLess);
      self._disableButton(self.options.classLoadLess);

      self._createPagination();
      self.bindPagination();
    },

    _clearPagination: function () {
      var self = this;

      self.options.$pagination.html('');
    },


    //  _                 _
    // | | ___   __ _  __| |
    // | |/ _ \ / _` |/ _` |
    // | | (_) | (_| | (_| |
    // |_|\___/ \__,_|\__,_|
    //

    load: function (method, page, callback) {
      var self = this;

      self.request.query.PageNumber = page;
      self._concatRequest();

      typeof callback === 'function' ?
        self._search(method, callback) : self._search(method);
    },

    _search: function (method, callback, attempts) {
      var self = this;

      self.options.$result.trigger('avantisearch.beforeSearch', [ self.options, self.request ]);

      if (typeof attempts === 'undefined') {
        attempts = 0;
      }

      $.ajax({
        url: self.request.url,
        type: 'GET'
      }).then(function (response) {
        var $list = self.options.$result.find('> div > ul');
        var $products = $(response).find('ul');

        $products.find('.last, .first').removeClass('last first');
        $products.find('.helperComplement').remove();

        var $item = $products.find('li');

        $item.attr('page', self.request.query.PageNumber);

        if (self.request.query.PageNumber > 1) {
          $item.addClass(self.options.classItemPreLoad);
        }

        $list[method]($products.html());

        if (self.options.$result.is(':hidden')) {
          self.options.$result.show();
        }

        self.options.$result.trigger('avantisearch.afterSearch', [ self.options, self.request ]);

        attempts = 0;

        typeof callback === 'function' && callback(self);

      }, function (response) {
        if (response.status === 500 && attempts < self.options.attempts) {
          attempts++;
          self._search(method, callback, attempts);
        }

        throw new Error('Error on get page', response);
      });
    },


    //  _          _
    // | |__   ___| |_ __   ___ _ __ ___
    // | '_ \ / _ \ | '_ \ / _ \ '__/ __|
    // | | | |  __/ | |_) |  __/ |  \__ \
    // |_| |_|\___|_| .__/ \___|_|  |___/
    //              |_|

    _setParamsFromCookie: function () {
      var self = this;

      var cookie = Cookies.get(self.options.cookieName);

      self.request.query = JSON.parse(cookie);
    },

    _applyCookieParams: function () {
      var self = this;

      self._setOrder();
      self._setFilters();
    },

    _setOrder: function () {
      var self = this;

      self.options.$selectOrder.val(self.request.O);
    },

    _setFilters: function (fq) {
      var self = this;

      var fq = self.request.query.fq;

      for (var filter in fq) {
        var value = fq[filter];

        if (typeof value === 'function') {
          return true;
        }

        var $checkbox = self.options.$filters.find('input[rel="fq='+ value +'"]');

        if ($checkbox.length) {
          $checkbox
            .attr('checked', 'checked')
            .parent()
            .addClass(self.options.classFilterActive);
        }
      }
    },

    _checkDefaultParams: function () {
      var self = this;

      return !!Object.keys(self.options.defaultParams).length;
    },

    _setDefaultParams: function () {
      var self = this;

      self.request = $.extend(true, self.request, self.options.defaultParams);
    },

    _setUrlHash: function (page) {
      var self = this;

      var pageNumber = typeof page !== 'undefined' ? page : self.request.query.PageNumber;
      window.location.hash = pageNumber;
    },

    _showItems: function (page) {
      var self = this;

      self.options.$result.trigger('avantisearch.beforeShowItems', [ self.options, self.request, page ]);

      self.options.$result
        .find('.'+ self.options.classItemPreLoad +'[page="'+ page +'"]')
        .removeClass(self.options.classItemPreLoad);

      self.options.$result.trigger('avantisearch.afterShowItems', [ self.options, self.request, page ]);
    },

    _enableButton: function (button) {
      var self = this;

      $('.'+ button).removeAttr('disabled');
    },

    _disableButton: function (button) {
      var self = this;

      $('.'+ button).attr('disabled', 'disabled');
    },

    _hideButton: function (button) {
      var self = this;

      $('.'+ button).addClass(self.options.classLoadBtnHide)
    },

    _showButton: function (button) {
      var self = this;

      $('.'+ button).removeClass(self.options.classLoadBtnHide)
    },

    /**
     * _getPageByType
     * @param  {string} type 'next' or 'prev'
     * @return {object}      showPage and nextPage
     */
    _getPageByType: function (type) {
      var self = this;

      var $items = self.options.$result.find('> div > ul > li');

      var method = 'last';
      var operation = '+';

      if (type === 'prev') {
        method = 'first';
        operation = '-';
      }

      var page = Number($items[method]().attr('page'));

      return {
        showPage: page,
        nextPage: eval(page + operation + 1)
      };
    },

    _concatRequest: function () {
      var self = this;

      var query = self.request.query;
      var url = self.request.route +'?';

      var len = Object.keys(query).length - 1;
      var index = 0;

      for (var item in query) {
        if (item === 'fq') {
          var fqResult = self._concatRequestFilter(query[item], item);
          url = url.concat(fqResult);

        } else {
          url = url.concat(item, '=', query[item]);
        }

        if (index !== len) {
          url = url.concat('&');
        }

        index++;
      }

      self.request.url = url;
    },

    _concatRequestFilter: function (array, item) {
      var self = this;

      var url = '';

      for (var i = 0, length = array.length; i < length; i++) {
        url = url.concat(item, '=', array[i]);

        if (i !== length - 1) {
          url = url.concat('&');
        }
      }

      return url;
    },

    _saveCookie: function (query) {
      var self = this;

      if (typeof query === 'undefined') {
        query = JSON.parse(JSON.stringify(self.request.query));
      }

      var queryStringify = JSON.stringify(query);

      Cookies.set(self.options.cookieName, queryStringify);
    },

    _loadNext: function (pageByType) {
      var self = this;

      if (pageByType.nextPage < 1 || pageByType.nextPage > self.options.totalPages) {
        return false;
      }

      return true;
    },

    _setPaginationInfo: function () {
      var self = this;

      self.options.totalItems = self._getTotalItems();
      self.options.totalPages = self._getTotalPages();
    },

    _loadFirst: function (callback) {
      var self = this;

      self._getTotalItems(function (totalItems) {
        self.options.totalItems = parseInt(totalItems);
        self.options.$totalItems.text(totalItems);
        self.options.totalPages = self._getTotalPages();

        self._startFirst(1, self.options.totalPages === 1 ? false : true, callback);
      });
    },

    /**
     * Get total items
     * @param  {function} callback If have callback means that it will pick up from API, else pick up from element in page
     * @return {number}
     */
    _getTotalItems: function (callback) {
      var self = this;

      /**
       * Get total items from API
       */
      if (typeof callback === 'function') {
        var filter = self.request.query.fq;
        var fq = self._concatRequestFilter(filter, 'fq');
        var url = '/api/catalog_system/pub/products/search?'+ fq +'&_from=0&_to=1'

        $.ajax({
          url: url,
          type: 'get'
        }).then(function (response, textStatus, request) {
          var resources = request.getResponseHeader('resources');
          var totalItems = parseInt(resources.split('/')[1]);

          return callback(totalItems);
        });

        return false;
      }

      /**
       * Get total items from element
       */
      var result = self.options.$totalItems.text();
      var pattern = /\D/g;
      var total = result.replace(pattern, '');

      return parseInt(Math.ceil(total));
    },

    _getTotalPages: function () {
      var self = this;

      var ps = self.request.query.PS;
      var totalItems = self.options.totalItems;

      var totalPages = Math.ceil(totalItems / ps);

      return totalPages;
    },

    /**
     * Pagination
     */
    _createPagination: function () {
      var self = this;

      self.options.$pagination = $('.'+ self.options.classPagination);

      self._createPaginationFirstButton();
      self._createPaginationPrevButton();
      self._createPaginationButtons();
      self._createPaginationNextButton();
      self._createPaginationLastButton();
    },

    _createPaginationFirstButton: function () {
      var self = this;

      var $first = $('<button />', {
        class: 'pagination__button pagination__button--first',
        page: '1'
      }).text(self.options.textPaginationFirst);
      self.options.$pagination.append($first);

      if (self.request.query.PageNumber === 1) {
        self._disablePaginationButton($first);
      }
    },

    _createPaginationPrevButton: function () {
      var self = this;

      var $prev = $('<button />', {
        class: 'pagination__button pagination__button--prev',
        page: self.request.query.PageNumber - 1
      }).text(self.options.textPaginationPrev);
      self.options.$pagination.append($prev);

      if (self.request.query.PageNumber === 1) {
        self._disablePaginationButton($prev);
      }
    },

    _createPaginationButtons: function () {
      var self = this;

      for (var i = self.request.query.PageNumber - self.options.paginationRangeButtons; i <= self.request.query.PageNumber; i++) {
        if (i < 1 || i === self.request.query.PageNumber) {
          continue;
        }

        var $page = $('<button />', {
          class: 'pagination__button pagination__button--page',
          page: i
        }).text(i);
        self.options.$pagination.append($page);
      }

      var $page = $('<button />', {
        class: 'pagination__button pagination__button--page pagination__button--disabled pagination__button--current',
        page: self.request.query.PageNumber,
        disabled: 'disabled'
      }).text(self.request.query.PageNumber);
      self.options.$pagination.append($page);

      for (var i = self.request.query.PageNumber + 1; i <= self.request.query.PageNumber + self.options.paginationRangeButtons; i++) {
        if (i > self._getTotalPages()) {
          continue;
        }

        var $page = $('<button />', {
          class: 'pagination__button pagination__button--page',
          page: i
        }).text(i);
        self.options.$pagination.append($page);
      }
    },

    _createPaginationNextButton: function () {
      var self = this;

      var $next = $('<button />', {
        class: 'pagination__button pagination__button--next',
        page: self.request.query.PageNumber + 1
      }).text(self.options.textPaginationNext);
      self.options.$pagination.append($next);

      if (self.request.query.PageNumber === self._getTotalPages()) {
        self._disablePaginationButton($next);
      }
    },

    _createPaginationLastButton: function () {
      var self = this;

      var $last = $('<button />', {
        class: 'pagination__button pagination__button--last',
        page: self._getTotalPages()
      }).text(self.options.textPaginationLast);
      self.options.$pagination.append($last);

      if (self.request.query.PageNumber === self._getTotalPages()) {
        self._disablePaginationButton($last);
      }
    },

    _disablePaginationButton: function ($element) {
      var self = this;

      $element
        .addClass('pagination__button--disabled')
        .attr('disabled', 'disabled');
    },


    //                                 _                     _       _     _
    //  _ __ ___  __ _ _   _  ___  ___| |_  __   ____ _ _ __(_) __ _| |__ | | ___
    // | '__/ _ \/ _` | | | |/ _ \/ __| __| \ \ / / _` | '__| |/ _` | '_ \| |/ _ \
    // | | |  __/ (_| | |_| |  __/\__ \ |_   \ V / (_| | |  | | (_| | |_) | |  __/
    // |_|  \___|\__, |\__,_|\___||___/\__|   \_/ \__,_|_|  |_|\__,_|_.__/|_|\___|
    //              |_|
    //

    _setRequest: function () {
      var self = this;

      var requestUrl = self._getRequestUrl();
      return self._splitRequestUrl(requestUrl);
    },

    _getRequestUrl: function () {
      var self = this;

      var scriptContent = self.options.$script.html();
      var pattern = /\/buscapagina\?.+&PageNumber=/gi;
      var url = pattern.exec(scriptContent)[0];

      return decodeURIComponent(url);
    },

    _splitRequestUrl: function (url) {
      var self = this;

      var splitUrl = url.split('?');
      var route = splitUrl[0];

      if (splitUrl.length > 1) {
        var queryString = splitUrl[1];
        var splitHash = queryString.split('#');

        var query = splitHash[0];
        var hash = splitHash[1];

        var queryObject = {};
        queryObject['fq'] = [];

        query.replace(/([^=&]+)=([^&]*)/g, function (m, key, value) {
          var urlValue = decodeURIComponent(value);
          var urlKey = decodeURIComponent(key)

          if (urlKey === 'fq') {
            queryObject[urlKey].push(urlValue);

          } else if (urlKey === 'PageNumber' && value === '') {
            queryObject[urlKey] = 1;

          } else {
            queryObject[urlKey] = urlValue;
          }
        });

        return ({
          route: route,
          query: queryObject,
          hash: hash,
          url: url
        });
      }

      return ({
        route: route,
        url: url
      });
    },


    //  _     _           _
    // | |__ (_)_ __   __| |
    // | '_ \| | '_ \ / _` |
    // | |_) | | | | | (_| |
    // |_.__/|_|_| |_|\__,_|
    //

    bind: function () {
      var self = this;

      self.bindLoadMoreAndLess();
      self.bindOrder();
      self.bindFilters();
    },

    bindLoadMoreAndLess: function () {
      var self = this;

      $('.'+ self.options.classLoadLess +', .'+ self.options.classLoadMore)
        .on('click', function (event) {
          event.preventDefault();

          var type = 'next';
          var method = 'append';
          var hide = self.options.classLoadMore;

          if ($(this).hasClass(self.options.classLoadLess)) {
            type = 'prev';
            method = 'prepend';
            hide = self.options.classLoadLess;
          }

          var pageByType = self._getPageByType(type);

          var query = $.extend({}, self.request.query);
          query.PageNumber = pageByType.showPage;
          self._saveCookie(query);

          self._loadNext(pageByType) ?
            self.load(method, pageByType.nextPage) :
            self._hideButton(hide)

          self._setUrlHash(pageByType.showPage);
          self._showItems(pageByType.showPage);
        });
    },

    bindOrder: function () {
      var self = this;

      if (self.options.$selectOrder.attr('id') === 'O') {
        self.options.$selectOrder
          .removeAttr('onchange')
          .unbind('change')
          .off('change');
      }

      self.options.$selectOrder
        .on('change', function (event) {
          event.preventDefault();

          var _this = $(this);
          var value = _this.val();

          self.options.$result.trigger('avantisearch.beforeChangeOrder', [ self.options, self.request, _this ]);
          self._setUrlHash(1);
          self._changeOrder(value, function () {
            self.options.$result.trigger('avantisearch.afterChangeOrder', [ self.options, self.request, _this ]);
          });
        });
    },

    _changeOrder: function (value, callback) {
      var self = this;

      self.request.query.O = value;

      self._concatRequest();
      self._setUrlHash(1);

      self._loadFirst(callback);
    },

    bindFilters: function () {
      var self = this;

      self.options.$filters.on('click', function (event) {
        if (event.target.tagName === 'LABEL') {
          return true;
        }

        var _this = $(this);
        var $checkbox = _this.find('input');
        var checked = $checkbox.is(':checked');
        var filter = $checkbox.attr('rel');

        if (checked) {
          _this.addClass(self.options.classFilterActive);

        } else {
          _this.removeClass(self.options.classFilterActive);
        }

        self.options.$result.trigger('avantisearch.beforeFilter', [ self.options, self.request, _this ]);
        self._refreshFilter(filter, checked, function () {
          self.options.$result.trigger('avantisearch.afterFilter', [ self.options, self.request, _this ]);
          self._setUrlHash(1);
        });
      });
    },

    /**
     * Refresh filter
     * @param  {string} filter Filter
     * @param  {boolean} action true: add; false: remove
     */
    _refreshFilter: function (filter, action, callback) {
      var self = this;

      var filterSplit = filter.split('=');

      var key = filterSplit[0];
      var value = filterSplit[1];

      if (action) {
        self.request.query[key].push(value);

      } else {
        var index = self.request.query[key].indexOf(value);
        self.request.query[key].splice(index, 1);
      }

      self._loadFirst(callback);
    },

    bindPagination: function () {
      var self = this;

      $('.'+ self.options.classPagination).find('button').on('click', function (e) {
        e.preventDefault();

        var _this = $(this);
        var page = parseInt(_this.attr('page'));

        self.options.$result.trigger('avantisearch.beforeChangePage', [ self.options, self.request ]);

        self.load('html', page, function () {
          self._setUrlHash(page);
          self._showItems(page);

          self.request.query.PageNumber = page;
          self._clearPagination();
          self._startPagination();
          self._concatRequest();
          self._saveCookie();

          self.options.$result.trigger('avantisearch.afterChangePage', [ self.options, self.request ]);
        });
      });
    },


    //              _   _
    //   ___  _ __ | |_(_) ___  _ __  ___
    //  / _ \| '_ \| __| |/ _ \| '_ \/ __|
    // | (_) | |_) | |_| | (_) | | | \__ \
    //  \___/| .__/ \__|_|\___/|_| |_|___/
    //       |_|

    getDefaultOptions: function () {
      var self = this;

      return {
        /**
         * Elements
         */
        $resultItemsWrapper: $('.resultItemsWrapper'),
        $script: $('.resultItemsWrapper').children('script'),
        $totalItems: $('.searchResultsTime:first .resultado-busca-numero .value'),
        $selectOrder: $('#O'),
        $filters: $('.search-multiple-navigator label'),

        /**
         * Classes
         */
        classFilterActive: 'filter--active',
        classItemPreLoad: 'shelf-item--preload',
        classLoadBtnHide: 'load-btn--hide',
        classLoadLess: 'load-less',
        classLoadMore: 'load-more',
        classPagination: 'pagination',

        /**
         * Texts
         */
        textLoadLess: 'Load less',
        textLoadMore: 'Load more',
        textPaginationFirst: 'First',
        textPaginationPrev: 'Prev',
        textPaginationNext: 'Next',
        textPaginationLast: 'Last',

        /**
         * Pagination
         */
        pagination: false,
        paginationRangeButtons: 3,

        /**
         * Others
         */
        cookieName: 'AvantiSearchQuery',
        defaultParams: {
          // 'query': {
          //   'O': 'OrderByPriceASC'
          // }
        },
        attempts: 1
      }
    }
  };

  $.fn.avantiSearch = function (settings) {
    var $result = this;

    window.AvantiSearch = AvantiSearch.init($result, settings);

    return $result;
  };
}(jQuery));

/**
 * Avoid VTEX animation
 */
function goToTopPage() {}
