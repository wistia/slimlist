if(typeof WistiaPlaylist=="undefined") {
	WistiaPlaylist = function(){
	
		// embed options to use when playing a video
		this.playEmbedOptions = {autoPlay: true, playButtonVisible: false, stillUrl: '' };
	
		// render the basic player markup
		this.initialize = function(){
			this.playerId = 'wistia_player_' + WistiaPlaylist.prototype.numberOfPlayers++;
			
			// nothing selected yet
			this.currentSectionId = false;
			this.currentVideoId = false;
			
			document.write("<div id='" + this.playerId + "' class='wistia-player'>" +
										 "<div class='wistia-sections'></div>" +
										 "<div class='wistia-video'><div class='loading'></div></div>" + 
										 "<div class='wistia-playlist'></div>" +
										 "</div>");
			
			// store all the critical elements for easy access
			this.playerElt = document.getElementById(this.playerId);
			this.sectionsElt = this.playerElt.childNodes[0];
			this.videoElt = this.playerElt.childNodes[1];
			this.playlistElt = this.playerElt.childNodes[2];
		};
		
		// take all the data and restructure it into an object
		// use the video id's as keys
		this.storeVideoData = function(data){
			// this is where we're storing this stuff
			this.videoData = {};
			// and here's where we store the play order
			this.videoIds = [];
			
			var section, video;
			
			// loop through sections
			for (var i = 0; i < data.length; i++) {
				section = data[i];
				
				// loop through videos
				for (var j = 0; j < section.medias.length; j++) {
					video = section.medias[j];
					
					// store this video
					this.videoData[video.id] = {
						sectionId: section.id,
						embed: video.embed
					};
					
					// add it to the videoIds list
					this.videoIds.push(video.id);					
				}
				
			}
		}
		
		// loads the section tabs
		this.loadSections = function(data){
			// if there's only one section, don't render the tabs
			if (data.length <= 1) return;
			
			var sections = document.createElement('ul');
			for (var i = 0; i < data.length; i++) {
				// skip empty sections
				if (data[i].medias.length == 0) continue;
				
				var section = this.buildSectionTab(data[i]);
				sections.appendChild(section);
			}
			this.sectionsElt.appendChild(sections);
		};

		// loads the playlists for all the sections
		this.loadPlaylists = function(data){
			// loop through each section
			for (var i = 0; i < data.length; i++) {
				
				// gather the media for this section
				var medias = data[i].medias;
			  
				// make the playlist elt
				var playlist = document.createElement('ul');
				playlist.id = this.eltId('playlist', data[i].id);
				
				// loop through all the media in this section
				for (var j = 0; j < medias.length; j++) {
					// build it and add it to the playlist
					playlist.appendChild(this.buildPlaylistItem(medias[j]));
			  }
				this.playlistElt.appendChild(playlist);
			}
		};

		// create a section tab elt and return it
		this.buildSectionTab = function(section) {
			var self = this;
			var sectionElt = document.createElement('li');
			sectionElt.id = this.eltId('section', section.id);
			sectionElt.innerHTML = "<a href='#'>" + section.name + "</a>";
			sectionElt.onclick = function(e){ self.selectSection(section.id); return false; };
			
			return sectionElt;
		};
		
		// make a playlist item elt and return it
		this.buildPlaylistItem = function(video) {
			var itemElt = document.createElement('li');
			itemElt.id = this.eltId('video', video.id);
			
			var thumb;
			if (video.thumbnail) thumb = "<img src='" + video.thumbnail.url + "' width='" + video.thumbnail.width + "' height='" + video.thumbnail.height + "'/>"
			else thumb = '';
			
	  	itemElt.innerHTML = "<a href='#'>" + thumb + video.name + "</a></li>";
			
			// hookup the click handler
			var self = this;
			itemElt.onclick = function(e){ self.selectVideo(video.id, self.playEmbedOptions); return false; }
			
			return itemElt;
		};
		
		// this fn is called by the JSONP callback
		this.loadData = function(data){
			this.loadSections(data);
			this.loadPlaylists(data);
			
			// store all this data in an object
			this.storeVideoData(data);
			
			// select the first video
			this.selectVideo(this.videoIds[0]);
		};
		
		
		// select a section
		this.selectSection = function(id) {
			// first, let's unselect the current section and playlist
			if (this.currentSectionId) {
				document.getElementById(this.eltId('section', this.currentSectionId)).className = '';
				document.getElementById(this.eltId('playlist', this.currentSectionId)).className = '';
			}
			
			// second, let's select the appropriate section and playlist
			var sectionElt = document.getElementById(this.eltId('section', id));
			if (sectionElt) {
	  		sectionElt.className = 'selected';
				this.currentSectionId = id;
	  	}
			
			document.getElementById(this.eltId('playlist', id)).className = 'selected';
		};
		
		// select a video based on its id
		this.selectVideo = function(id, embedOptions) {
			// select the appropriate section
			this.selectSection(this.videoData[id].sectionId);
			
			// unselect current selected video
			if (this.currentVideoId) {
				document.getElementById(this.eltId('video', this.currentVideoId)).className = '';
			}
			
			// select the video
			document.getElementById(this.eltId('video', id)).className = 'selected';
			
			// show the embed
			this.videoElt.innerHTML = this.getEmbedCode(id, embedOptions);
			
			this.currentVideoId = id;
		};
		
		// get and modify (hack) the embed code based on the options
		this.getEmbedCode = function(id, options) {
			var code = this.videoData[id].embed;
			
			// modify the embed code based on the options
			// this does a search and replace for key=value in the embed code
			for (var key in options) {
	  		var re = new RegExp(key + '=[^\\&\\"]+', 'g');
				code = code.replace(re, key + '=' + options[key]);
	  	}
			
			return code;
		};
		
		// gets the next video id to play based on section and playlist order. 
		// if we're playing the last video, this will return the first.
		this.nextVideoId = function() {
			for (var i = 0; i < this.videoIds.length; i++) {
				if (this.videoIds[i] == this.currentVideoId) {
					// we've found the current video id, so let's return the next one
					if (i + 1 < this.videoIds.length) {
						return this.videoIds[i+1];
					} else {
						// the current video is the last one, so we'll return the first one
						return this.videoIds[0];
					}
				}
			}
		};
		
		// play the next video
		this.playNextVideo = function() {
			this.selectVideo(this.nextVideoId(), this.playEmbedOptions);
		};
		
		// returns the id for a type of  element given an integer
		// e.g. this.eltId('section', 123) //=> 'wistia_player_0_section_123'
		this.eltId = function(type, id) {
			return this.playerId + '_' + type + '_' + id;
		};
		
		
		this.initialize();
	};

	// to allow for more than one wistia player on a page, we keep track of them
	WistiaPlaylist.prototype.numberOfPlayers = 0;
};