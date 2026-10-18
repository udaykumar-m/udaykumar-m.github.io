 AOS.init({
        duration: 1200,
      })

      function type(){
        $('.know').html('<h1><span class="first">Web</span> Developer</h1>');
        setTimeout(function () {
          $('.know').html('<h1>PHP <span class="first">Developer</span></h1>');
        }, 3000);
        setTimeout(function () {
          $('.know').html('<h1><span class="second">Android</span> Developer</h1>');
        }, 6500);
        setTimeout(function () {
          $('.know').html('<h1>IOT <span class="second">Developer</span></h1>');
        }, 9500);
        setTimeout(type,12800);
      }
      type();

      var sections = $('section')
        , nav = $('.navbar')
        , nav_height = nav.outerHeight();
       
      $(window).on('scroll', function () {
        var cur_pos = $(this).scrollTop();
        sections.each(function() {
          var top = $(this).offset().top - nav_height,
              bottom = top + $(this).outerHeight();
          if (cur_pos >= top && cur_pos <= bottom) {
            nav.find('a').removeClass('active');
            sections.removeClass('active');
       
            $(this).addClass('active');
            nav.find('a[href="#'+$(this).attr('id')+'"]').addClass('active');
          }
        });
      });
      nav.find('a').on('click', function () {
        var $el = $(this)
          , id = $el.attr('href');
       
        $('html, body').animate({
          scrollTop: $(id).offset().top - nav_height
        }, 500);
       
        return false;
      });

      // skill percentage counters
        $('.count').each(function () {
            $(this).prop('Counter',0).animate({
                Counter: $(this).text()
            }, {
                duration: 5000,
                easing: 'linear',
                step: function (now) {
                    $(this).text(Math.ceil(now)+"%");
                }
            });
        });

        $(document)
          .mousemove(function(e) {
            setTimeout(function() {
              $('.cursor')
                .eq(0)
                .css({
                  left: e.pageX,
                  top: e.pageY-15
                });
            }, 100);
          });


          //toast
        $('#submit').click(function(){
          $('.toast').toast('show');
        });