
var BlogCommentHandler = function(options) {
    var obj = this;
 
    // Merge options with defaults
    var settings = $.extend({
       param: 'defaultValue'
    }, options || {});
    this.initFacebook();
    this.addEvents();
};

BlogCommentHandler.prototype.initFacebook = function() {
    var me = this;
    $(document).ready(function() {
      // Additional JS functions here
      window.fbAsyncInit = function() {
        FB.init({
          appId      : '312874575491115', // App ID
          channelUrl : '//www.kristinazakrzewski.com/channel.html', // Channel File
          status     : true, // check login status
          cookie     : true, // enable cookies to allow the server to access the session
          xfbml      : true  // parse XFBML
        });
    
        // Additional init code here
        FB.getLoginStatus(function(response) {
          if (response.status === 'connected') {
            // connected
            console.log('you are logged into fb', response);
            $('#fb-details').attr('data-loggedin', 1);
            me.facebookGetUserDetails();
          } else if (response.status === 'not_authorized') {
            // not_authorized
            console.log("not authorized");
            $('#fb-details').attr('data-loggedin', 0);
            $('.add-a-comment').html('Login using your Facebook account to add a comment');
          } else {
            // not_logged_in
            console.log("not logged in");
            $('#fb-details').attr('data-loggedin', 0);
            $('.add-a-comment').html('Login using your Facebook account to add a comment');
          }
        });
      };
              
      // Load the SDK Asynchronously
      (function(d){
         var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
         if (d.getElementById(id)) {return;}
         js = d.createElement('script'); js.id = id; js.async = true;
         js.src = "//connect.facebook.net/en_US/all.js";
         ref.parentNode.insertBefore(js, ref);
       }(document));
       
    });
};

BlogCommentHandler.prototype.facebookLogin = function(cb) {
    var me = this;
    FB.login(function(response) {
        if (response.authResponse) {
            // connected
            me.facebookGetUserDetails(cb);
            $('.add-a-comment').html('Add a comment');
        } else {
            // cancelled
        }
    });        
};

BlogCommentHandler.prototype.facebookGetUserDetails = function(cb) {
    FB.api('/me?fields=picture,name,id', function(response) {
        $('#fb-details').attr('data-loggedin', 1);
        $('#fb-details').attr('data-userid', response.id);
        $('#fb-details').attr('data-username', response.name);
        $('#fb-details').attr('data-userpic', response.picture.data.url);
        if (cb) {
            cb();
        }
    });
};    


BlogCommentHandler.prototype.addEvents = function() {
    var me = this;

    $(document).ready(function() {
        // set all textareas to autogrow
        $("textarea").autoGrow();
                
        // click on "Add a comment" link
        $('.add-a-comment').bind('click', function(e) {
            e.preventDefault();
            console.log("got click on add first comment and the blog id is:", $(this).parents('.entry').attr('id'));
            var loggedin = $('#fb-details').attr('data-loggedin');
            if (loggedin == "0") {
                me.facebookLogin(function() {
                    var username = $('#fb-details').attr('data-username');
                    $(this).parents('.comments-list').find('.comment-user').html("commenting as " + username);
                    $(this).parents('.comments-list').find('.add-comment').slideDown();
                });
            } else {
                    $(this).parents('.comments-footer').hide();
                    var username = $('#fb-details').attr('data-username');
                    $(this).parents('.comments-list').find('.comment-user').html("<img height='25' src='" + $('#fb-details').attr('data-userpic') + "'> Commenting as " + username);
                    $(this).parents('.comments-list').find('.add-comment').slideDown(function() {
                        $(this).find('textarea').focus();
                    });
            }
        });
        
        // cancel a comment
        $('.cancel-comment').bind('click', function(e){
            e.preventDefault();
            console.log("cancel clicked");
            $(this).parents('.add-comment').slideUp(function() {
                $(this).parents('.comments-list').children('.comments-footer').slideDown();
            });
        });
        
        // submit a comment
        $('.submit-comment').bind('click', function(e){
            e.preventDefault();
            var that = this;
            var comment =   {
                            blogid: $(this).parents('.entry').attr('id'),
                            userid: $('#fb-details').attr('data-userid'),
                            username: $('#fb-details').attr('data-username'),
                            userpic: $('#fb-details').attr('data-userpic'),
                            body: $(this).prev('textarea').val()
                            }
            console.log("submit clicked, creating comment:", comment);
            $.ajax({
                url: '/blog/comment',
                type: 'POST',
                data: {properties: JSON.stringify(comment)},
                dataType: 'json',
                success: function(response) {
                    $(that).prev('textarea').val('');
                    $(that).parents('.add-comment').slideUp(function() {
                        $(that).parents('.comments-list').children('.comments-footer').slideDown(function() {
                            $(that).parents('.comments-list').children('.comments-footer').before('<li class="user-comment" data-commentid="' 
                            + response.commentid + '" data-commentuserid="' + comment.userid + '"><a href="#"><div class="delete-x hidden">x</div></a><div class="comment"><img height="20" src="' 
                            + comment.userpic + '" /> ' + '<span class="hlight">' + comment.username + '</span><br/>' + comment.body 
                            + '<br/><span class="time-ago">Just now</span></div></li>');
                        });
                    });
                }
            });
            
        });
        
        // hover on a comment to toggle delete option
        $('.user-comment').live('mouseenter', function(e) {
           if ($(this).attr('data-commentuserid') == $('#fb-details').attr('data-userid')) {
                $(this).find('.delete-x').removeClass('hidden'); 
           }
        });
        // hover on a comment to toggle delete option
        $('.user-comment').live('mouseleave', function(e) {
           if ($(this).attr('data-commentuserid') == $('#fb-details').attr('data-userid')) {
                $(this).find('.delete-x').addClass('hidden'); 
           }
        });
        
        // delete a comment
        $('.user-comment .delete-x').live('click', function(e) {
            e.preventDefault();
            var that = this;
            var comment =   {
                            blogid: $(that).parents('.entry').attr('id'),
                            commentid: $(that).parents('.user-comment').attr('data-commentid')
                            }
            console.log("delete clicked, deleting comment:", comment);
            $.ajax({
                url: '/blog/comment/delete',
                type: 'POST',
                data: {properties: JSON.stringify(comment)},
                dataType: 'json',
                success: function(response) {
                    $(that).parents('.user-comment').slideUp(function(){
                        $(that).parents('.user-comment').remove();
                    });
                }
            });
        });
    
    });
    
};

