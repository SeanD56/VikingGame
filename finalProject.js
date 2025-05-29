"use strict";

//globals
var canvas;
var gl;

//buffer globals
var vertices = [];
var heartVertices = [];
var vBuffer;
var heartBuffer;
var tBuffer;

//viking globals
var scaling_l = 0.01;  
var y_floor = -0.45;
var y_ceiling = 0.71;
var x_start = -0.4;
var x_viking = x_start;
var y_viking = y_floor;
var platform_y = -1.0;

var num_lives = 3;
var invicibleTime = 0;
var gameWon = "False";
var lifeCollected = [];

//global matrix variables
var ctm; 
var sm = scalem(scaling_l, scaling_l, scaling_l);
var u_ctmLoc;
var projMatrix; 
var mvMatrix;
var u_mvMatrixLoc;
var u_projMatrixLoc;
var u_viewMatrixLoc;
var a_vPositionLoc;
var u_baseColorLoc;
var u_enemyCTMLoc;

var enemyPositionBool = 0;

//pixel art globals
var ctMatrices = [];
var colors = [];
var enemyCTMatrices = [];
var enemyColors = [];
var characterArr = [];
var characterArrLen;
var swordArr = [];
var weakEnemyArr = [];
var strongEnemyArr = [];

var skinInc;
var blackInc;
var brownInc;
var lightGrayInc;
var weaponDarkGrayInc;
var darkGrayInc;
var weaponHandleInc;
var weaponLightGrayInc;
var enemyEyeInc;

//sword globals
var swordSwing = "False";
var swordTheta = 0;
var swordThetaInc = 5;
var swordThetaCount = 0;
var swordFrontX;
var swordBackX;
var swordTopY;
var swordBottomY;

//enemy globals
var weak_enemies = [];
var strong_enemies = [];

//texture and background globals
var u_drawTexture = 0.0;
var a_vTexCoordLoc;
var u_texBaseColorLoc;

var texCoordsArray = [];

var floorTexture;
var backgroundTexture;
var poleTexture;

var first_texture_x = -3.5;
var last_texture_x = 3.5;

var floor_block_size = 0.5;
var background_block_size = 2.0;
var background_shift = 0.0

var pole_x = 8.0;

var platforms = {};
var platformArr = [];


//vmovement globals
var move_r = "False";
var move_l = "False";
var right_movement = 0.0;
var left_movement = 0.0;
var pressedKeys = {};

var jumping = "False";
var double_jump = "False"
var jump_velocity = 0.0;




window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //  Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.9, 0.9, 0.9, 1.0 );

    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    enemyPositionBool = document.getElementById("enemyPositionBool");


    //setup box and heart vertices
    setup_box();
    setup_heart();

    //initialize buffer data
    heartBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, heartBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(heartVertices), gl.STATIC_DRAW );

    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    //initialize texture buffer data
    tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );


    // Associate out shader variables with our data buffer
    a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition" );
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_vPositionLoc );

    u_baseColorLoc = gl.getUniformLocation( program, "u_baseColor" );
    u_ctmLoc = gl.getUniformLocation( program, "u_ctMatrix" );
    u_mvMatrixLoc =  gl.getUniformLocation( program, "u_mvMatrix" );
    u_projMatrixLoc =  gl.getUniformLocation( program, "u_projMatrix" );
    u_viewMatrixLoc =  gl.getUniformLocation( program, "u_viewMatrix" );
    u_drawTexture = gl.getUniformLocation( program, "u_drawTexture" );

    u_enemyCTMLoc = gl.getUniformLocation( program, "u_enemyCTMatrix" );

    // send texture coordiantes data down to the GPU
    // to be implemented
    a_vTexCoordLoc = gl.getAttribLocation( program, "a_vTexCoord" );
    gl.vertexAttribPointer( a_vTexCoordLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( a_vTexCoordLoc );

    var u_texSamplerLoc = gl.getUniformLocation(program, "u_texSampler");
    gl.uniform1i(u_texSamplerLoc, 0);

    u_texBaseColorLoc = gl.getUniformLocation(program, "u_baseTextureColor");
    gl.uniform4fv(u_texBaseColorLoc, vec4(1.0,1.0,1.0,1.0));

    projMatrix = ortho(-1, 1, -1, 1, -1, 1);// orthogonal projection
    gl.uniformMatrix4fv(u_projMatrixLoc, false, flatten(projMatrix))


    //add keydown event listeners
    canvas.setAttribute('tabindex', 0);
    canvas.addEventListener('keydown', (e) => {

        //pressedKeys[Key] == "True" if Key is currently pressed
        pressedKeys[e.code] = "True";
        
        //enable jumping
        if (e.code === "KeyW" || e.code === "ArrowUp") {
            if (jumping != "True") {
                jumping = "True";  
                //jumping initial velocity
                jump_velocity = 0.03;
            } else {
                //if jumping and jump_velocity < double_jump_inital_veleocity, double jump
                if (double_jump == "False" && jump_velocity <= 0.015) {     //CHANGED TO 0.015 
                    double_jump = "True";
                    //double jump intiial velocity
                    jump_velocity = 0.02;
                }
            }
        }

        //enable sword swing with spacebar keydown
        if (e.code === "Space" || e.code === "mousedown") {
            if (swordTheta == 0) {
                swordThetaInc = -swordThetaInc; 
                swordSwing = "True";
                swordThetaCount = 0;
            }
        }

        //enable user to toggle music on/off with m key
        if (e.code === "KeyM") {
            var audio = document.getElementById('audioPlayer');

            if (audio.paused) {
                audio.play();
            } else {
                audio.pause();
            }

        }

    });

    //in the even of keyup on Key, mark key as not pressed
    canvas.addEventListener('keyup', (e) => {
        pressedKeys[e.code] = "False";
    });


     //initialize game textures
     initialize_textures();

     //allows for textures with transparent parts to be transparent
     gl.enable(gl.BLEND);
     gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)


    //setup game objects
    setup_viking();
    characterArrLen = length(characterArr);
    setup_sword();
    setup_enemy_weak();
    setup_enemy_strong();
    setup_platforms();
    create_enemies();
    
    lifeCollected[0] = false;


    render();

};



//checks if movement keys are currnetly being pressed
function read_movement_keys() {
    if (pressedKeys["KeyD"] == "True" || pressedKeys["ArrowRight"] == "True") {
        move_r = "True";
    }

    if (pressedKeys["KeyA"] == "True" || pressedKeys["ArrowLeft"] == "True") {
        move_l = "True";
    }
}



//set up box arrays
function setup_box() {
    // add box vertices to vertices array
    vertices.push(vec2(-1, 1));
    vertices.push(vec2(-1, -1));
    vertices.push(vec2(1, -1));
    vertices.push(vec2(1, -1));
    vertices.push(vec2(-1, 1));
    vertices.push(vec2(1, 1));

    //add box textrure coordinates to textureCoords Array
    texCoordsArray.push(vec2(0, 1)); // Bottom-left corner
    texCoordsArray.push(vec2(0, 0)); // Top-left corner
    texCoordsArray.push(vec2(1, 0)); // Top-right corner
    texCoordsArray.push(vec2(1, 0)); // Top-right corner
    texCoordsArray.push(vec2(0, 1)); // Bottom-left corner
    texCoordsArray.push(vec2(1, 1)); // Bottom-right corner
}



//set up heart vertices
function setup_heart() {
    heartVertices.push(vec2(0.0,0.0));
   
    //equation for heart found at: https://mathworld.wolfram.com/HeartCurve.html
    for (var t = 0; t <= 2 * Math.PI + 2 * Math.PI / 70; t += 2 * Math.PI / 70){
        var x = 16 * Math.sin(t) * Math.sin(t) * Math.sin(t);
        var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

        heartVertices.push(vec2(0.1 * x, 0.1 * y));
    }

}



function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}



//configures texture associated with image_id provided in HTML file
function configure_texture(texture, image_id) {

    var image = document.getElementById(image_id);

    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    
    //Flips the source data along its vertical axis when texImage2D or texSubImage2D are called when param is true. The initial value for param is false.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA,
         gl.RGBA, gl.UNSIGNED_BYTE, image );
    
    // Check if the image is a power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    } else {
        // No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
        // Prevents s-coordinate wrapping (repeating).
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        // Prevents t-coordinate wrapping (repeating).
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }


    return texture;
}



//initializes all textures
function initialize_textures() {
    
    floorTexture = configure_texture(floorTexture, "floorImage");
    backgroundTexture = configure_texture(backgroundTexture, "backgroundImage");
    poleTexture = configure_texture(poleTexture, "poleImage")

}



//sets up colors and matrices for weak enemy pixel art
function setup_enemy_weak() {
    weakEnemyArr.push(translate(0, 0, 0));
    weakEnemyArr.push(translate(0, scaling_l*2, 0));
    weakEnemyArr.push(translate(0+scaling_l*2, scaling_l*2, 0));
    weakEnemyArr.push(translate(0-scaling_l*2, scaling_l*2, 0));  //4

    weakEnemyArr.push(translate(-scaling_l*2, scaling_l*4, 0));
    weakEnemyArr.push(translate(0, scaling_l*4, 0));
    weakEnemyArr.push(translate(scaling_l*2, scaling_l*4, 0));
    weakEnemyArr.push(translate(scaling_l*4, scaling_l*4, 0));
    weakEnemyArr.push(translate(scaling_l*4, scaling_l*2, 0));
    weakEnemyArr.push(translate(scaling_l*4, 0, 0));
    weakEnemyArr.push(translate(scaling_l*2, 0, 0));      
    weakEnemyArr.push(translate(-scaling_l*2, 0, 0)); 
    weakEnemyArr.push(translate(-scaling_l*2, -scaling_l*2, 0));
    weakEnemyArr.push(translate(-scaling_l*2, -scaling_l*4, 0));
    weakEnemyArr.push(translate(-scaling_l*2, -scaling_l*6, 0)); 
    weakEnemyArr.push(translate(-scaling_l*2, -scaling_l*8, 0));
    weakEnemyArr.push(translate(-scaling_l*2, -scaling_l*10, 0));
    weakEnemyArr.push(translate(0, -scaling_l*2, 0));
    weakEnemyArr.push(translate(0, -scaling_l*4, 0));
    weakEnemyArr.push(translate(0, -scaling_l*6, 0));
    weakEnemyArr.push(translate(0, -scaling_l*8, 0));
    weakEnemyArr.push(translate(scaling_l*2, -scaling_l*8, 0));
    weakEnemyArr.push(translate(scaling_l*4, -scaling_l*8, 0));
    weakEnemyArr.push(translate(scaling_l*4, -scaling_l*10, 0));
    weakEnemyArr.push(translate(-scaling_l*4, -scaling_l*2, 0));
    weakEnemyArr.push(translate(-scaling_l*6, -scaling_l*2, 0));  
    weakEnemyArr.push(translate(scaling_l*4, -scaling_l*4, 0));   //23 (27)


    weakEnemyArr.push(translate(-scaling_l*8, -scaling_l*2, 0));
    weakEnemyArr.push(translate(-scaling_l*8, 0, 0));
    weakEnemyArr.push(translate(-scaling_l*8, scaling_l*2, 0));
    weakEnemyArr.push(translate(-scaling_l*8, scaling_l*4, 0));   // 13 (40)
    weakEnemyArr.push(translate(-scaling_l*8, scaling_l*6, 0));

    weakEnemyArr.push(translate(scaling_l*2, -scaling_l*2, 0));
    weakEnemyArr.push(translate(scaling_l*2, -scaling_l*4, 0));
    weakEnemyArr.push(translate(scaling_l*2, -scaling_l*6, 0));
    weakEnemyArr.push(translate(scaling_l*4, -scaling_l*2, 0));
    weakEnemyArr.push(translate(scaling_l*4, -scaling_l*6, 0));
    weakEnemyArr.push(translate(scaling_l*6, -scaling_l*2, 0));
    weakEnemyArr.push(translate(scaling_l*6, -scaling_l*4, 0));
    weakEnemyArr.push(translate(scaling_l*6, -scaling_l*6, 0));

    for (enemyEyeInc=0; enemyEyeInc<4; enemyEyeInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(weakEnemyArr[enemyEyeInc], ctm);
        enemyCTMatrices.push(ctm);
        enemyColors.push(vec3(0, 0, 0));  //face color
    }
    for (var enemySkinInc=4; enemySkinInc<enemyEyeInc+23; enemySkinInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(weakEnemyArr[enemySkinInc], ctm);
        enemyCTMatrices.push(ctm);
        enemyColors.push(vec3(202/255, 202/255, 202/255));  //face color
    }
    for (var enemyDGrayInc=enemySkinInc; enemyDGrayInc<enemySkinInc+13; enemyDGrayInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(weakEnemyArr[enemyDGrayInc], ctm);
        enemyCTMatrices.push(ctm);
        enemyColors.push(vec3(125/255, 125/255, 125/255));  //face color
    }

}



//sets up colors and matrices for strong enemy pixel art
function setup_enemy_strong() {
    strongEnemyArr.push(translate(0, 0, 0));
    strongEnemyArr.push(translate(0, scaling_l*2, 0));
    strongEnemyArr.push(translate(0+scaling_l*2, scaling_l*2, 0));
    strongEnemyArr.push(translate(0-scaling_l*2, scaling_l*2, 0));  //4

    strongEnemyArr.push(translate(-scaling_l*2, scaling_l*4, 0));
    strongEnemyArr.push(translate(0, scaling_l*4, 0));
    strongEnemyArr.push(translate(scaling_l*2, scaling_l*4, 0));
    strongEnemyArr.push(translate(scaling_l*4, scaling_l*4, 0));
    strongEnemyArr.push(translate(scaling_l*4, scaling_l*2, 0));
    strongEnemyArr.push(translate(scaling_l*4, 0, 0));
    strongEnemyArr.push(translate(scaling_l*2, 0, 0));      
    strongEnemyArr.push(translate(-scaling_l*2, 0, 0)); 
    strongEnemyArr.push(translate(-scaling_l*2, -scaling_l*2, 0));
    strongEnemyArr.push(translate(-scaling_l*2, -scaling_l*4, 0));
    strongEnemyArr.push(translate(-scaling_l*2, -scaling_l*6, 0)); 
    strongEnemyArr.push(translate(-scaling_l*2, -scaling_l*8, 0));
    strongEnemyArr.push(translate(-scaling_l*2, -scaling_l*10, 0));
    strongEnemyArr.push(translate(0, -scaling_l*2, 0));
    strongEnemyArr.push(translate(0, -scaling_l*4, 0));
    strongEnemyArr.push(translate(0, -scaling_l*6, 0));
    strongEnemyArr.push(translate(0, -scaling_l*8, 0));
    strongEnemyArr.push(translate(scaling_l*2, -scaling_l*8, 0));
    strongEnemyArr.push(translate(scaling_l*4, -scaling_l*8, 0));
    strongEnemyArr.push(translate(scaling_l*4, -scaling_l*10, 0));
    strongEnemyArr.push(translate(-scaling_l*4, -scaling_l*2, 0));
    strongEnemyArr.push(translate(-scaling_l*6, -scaling_l*2, 0));  
    strongEnemyArr.push(translate(scaling_l*4, -scaling_l*4, 0));   //23 (27)


    strongEnemyArr.push(translate(-scaling_l*8, -scaling_l*2, 0));
    strongEnemyArr.push(translate(-scaling_l*8, 0, 0));
    strongEnemyArr.push(translate(-scaling_l*8, scaling_l*2, 0));
    strongEnemyArr.push(translate(-scaling_l*8, scaling_l*4, 0));   // 13 (40)
    strongEnemyArr.push(translate(-scaling_l*8, scaling_l*6, 0));

    strongEnemyArr.push(translate(scaling_l*2, -scaling_l*2, 0));
    strongEnemyArr.push(translate(scaling_l*2, -scaling_l*4, 0));
    strongEnemyArr.push(translate(scaling_l*2, -scaling_l*6, 0));
    strongEnemyArr.push(translate(scaling_l*4, -scaling_l*2, 0));
    strongEnemyArr.push(translate(scaling_l*4, -scaling_l*6, 0));
    strongEnemyArr.push(translate(scaling_l*6, -scaling_l*2, 0));
    strongEnemyArr.push(translate(scaling_l*6, -scaling_l*4, 0));
    strongEnemyArr.push(translate(scaling_l*6, -scaling_l*6, 0));

    for (enemyEyeInc=0; enemyEyeInc<4; enemyEyeInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(strongEnemyArr[enemyEyeInc], ctm);
        enemyCTMatrices.push(ctm);
        enemyColors.push(vec3(0, 0, 0));  //face color
    }
    for (var enemySkinInc=4; enemySkinInc<enemyEyeInc+23; enemySkinInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(strongEnemyArr[enemySkinInc], ctm);
        enemyCTMatrices.push(ctm);
        enemyColors.push(vec3(253/255, 130/255, 2/255));  //face color
    }
    for (var enemyDGrayInc=enemySkinInc; enemyDGrayInc<enemySkinInc+13; enemyDGrayInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(strongEnemyArr[enemyDGrayInc], ctm);
        enemyCTMatrices.push(ctm);
        enemyColors.push(vec3(249/255, 188/255, 35/255));  //face color
    }
    /* characterArr.push(translate(0.0, 0.0, 0.0));
    characterArr.push(translate(scaling_l*2, 0.0, 0.0));
    characterArr.push(translate(scaling_l*4, 0.0, 0.0)); */


}



//sets up characterArr and ct Matrices for viking
function setup_viking() {
    // face , skin
    var characterArr = [];
    characterArr.push(translate(0.0, 0.0, 0.0));
    characterArr.push(translate(scaling_l*2, 0.0, 0.0));
    characterArr.push(translate(scaling_l*4, 0.0, 0.0));
    characterArr.push(translate(scaling_l*4, scaling_l*2, 0.0));
    characterArr.push(translate(-scaling_l*2, 0.0, 0.0));
    characterArr.push(translate(-scaling_l*4, 0.0, 0.0));
    characterArr.push(translate(-scaling_l*4, scaling_l*2, 0.0));
    characterArr.push(translate(0, scaling_l*2, 0.0));
    characterArr.push(translate(scaling_l*4, -scaling_l*2, 0.0));
    characterArr.push(translate(-scaling_l*4, -scaling_l*2, 0.0));

    characterArr.push(translate(-scaling_l*6, -scaling_l*4, 0.0));
    characterArr.push(translate(-scaling_l*6, -scaling_l*6, 0.0));
    characterArr.push(translate(scaling_l*6, -scaling_l*4, 0.0));
    characterArr.push(translate(scaling_l*8, -scaling_l*4, 0.0));  //characterArr.length = 14

    for (skinInc=0; skinInc<14; skinInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(characterArr[skinInc], ctm);
        ctMatrices.push(ctm);
        colors.push(vec3(196/255, 152/255, 4/255));  //face color
    }

    // dark grays in helmet and beard
    characterArr.push(translate(-scaling_l*2, -scaling_l*2, 0.0));
    characterArr.push(translate(-scaling_l*2, -scaling_l*4, 0.0));
    characterArr.push(translate(0, -scaling_l*4, 0.0));
    characterArr.push(translate(scaling_l*2, -scaling_l*4, 0.0));
    characterArr.push(translate(scaling_l*2, -scaling_l*2, 0.0));  //beard
    characterArr.push(translate(0, -scaling_l*6, 0.0));

    characterArr.push(translate(scaling_l*4, scaling_l*4, 0.0));
    characterArr.push(translate(scaling_l*6, scaling_l*8, 0.0));
    characterArr.push(translate(-scaling_l*4, scaling_l*4, 0.0));
    characterArr.push(translate(-scaling_l*6, scaling_l*8, 0.0));  // 24, 10

    for (darkGrayInc=skinInc; darkGrayInc<skinInc+10; darkGrayInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(characterArr[darkGrayInc], ctm);
        ctMatrices.push(ctm);
        colors.push(vec3(105/255, 105/255, 105/255));  //face color
    }

    // light grays in helmet and beard
    characterArr.push(translate(0, -scaling_l*2, 0.0));

    characterArr.push(translate(0, scaling_l*4, 0.0));
    characterArr.push(translate(0, scaling_l*6, 0.0));
    characterArr.push(translate(-scaling_l*2, scaling_l*4, 0.0));
    characterArr.push(translate(-scaling_l*2, scaling_l*6, 0.0));
    characterArr.push(translate(scaling_l*2, scaling_l*4, 0.0));
    characterArr.push(translate(scaling_l*2, scaling_l*6, 0.0));
    characterArr.push(translate(0, scaling_l*8, 0.0));     //32, 8

    for (lightGrayInc=darkGrayInc; lightGrayInc<darkGrayInc+8; lightGrayInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(characterArr[lightGrayInc], ctm);
        ctMatrices.push(ctm);
        colors.push(vec3(123/255, 123/255, 123/255));  //face color
    }

    
    // black in char
    characterArr.push(translate(scaling_l*2, scaling_l*2, 0.0));
    characterArr.push(translate(-scaling_l*2, scaling_l*2, 0.0));
    characterArr.push(translate(scaling_l*4, -scaling_l*10, 0.0));
    characterArr.push(translate(-scaling_l*4, -scaling_l*10, 0.0));        //36, 4

    for (blackInc=lightGrayInc; blackInc<lightGrayInc+4; blackInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(characterArr[blackInc], ctm);

        ctMatrices.push(ctm);
        colors.push(vec3(0/255, 0/255, 0/255));  //face color
    }

    
    // brown in char
    characterArr.push(translate(-scaling_l*4, -scaling_l*4, 0.0));
    characterArr.push(translate(scaling_l*4, -scaling_l*4, 0.0));
    characterArr.push(translate(-scaling_l*4, -scaling_l*6, 0.0));
    characterArr.push(translate(scaling_l*4, -scaling_l*6, 0.0));
    characterArr.push(translate(-scaling_l*4, -scaling_l*8, 0.0));
    characterArr.push(translate(scaling_l*4, -scaling_l*8, 0.0));
    characterArr.push(translate(-scaling_l*2, -scaling_l*6, 0.0));
    characterArr.push(translate(scaling_l*2, -scaling_l*6, 0.0));
    characterArr.push(translate(-scaling_l*2, -scaling_l*8, 0.0));
    characterArr.push(translate(scaling_l*2, -scaling_l*8, 0.0));
    characterArr.push(translate(0, -scaling_l*8, 0.0));

    characterArr.push(translate(scaling_l*4, scaling_l*6, 0.0));
    characterArr.push(translate(-scaling_l*4, scaling_l*6, 0.0));
    characterArr.push(translate(scaling_l*6, scaling_l*6, 0.0));
    characterArr.push(translate(-scaling_l*6, scaling_l*6, 0.0));       //51, 15
    
    
    for (brownInc=blackInc; brownInc<blackInc+15; brownInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(characterArr[brownInc], ctm);

        ctMatrices.push(ctm);
        colors.push(vec3(82/255, 52/255, 33/255));  //face color
    }
}



//set up swordArr and ct Matrices for sword
function setup_sword() {

    var sword_rm = rotateZ(0);
  
    swordArr.push(translate(scaling_l*10, -scaling_l*4, 0.0));
    swordArr.push(translate(scaling_l*10, -scaling_l*6, 0.0));
    swordArr.push(translate(scaling_l*10, -scaling_l*2, 0.0));
    swordArr.push(translate(scaling_l*10, 0, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*2, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*4, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*6, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*8, 0.0));

    for (var weaponHandleInc=0; weaponHandleInc<8; weaponHandleInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(swordArr[weaponHandleInc], ctm);
        ctm = mult(sword_rm, ctm);
        ctMatrices.push(ctm);
        colors.push(vec3(82/255, 43/255, 18/255));  //face color
        
    }


    // dark gray sword parts
    swordArr.push(translate(scaling_l*10, scaling_l*20, 0.0));
    swordArr.push(translate(scaling_l*10, -scaling_l*8, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*10, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*12, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*14, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*16, 0.0));
    swordArr.push(translate(scaling_l*8, scaling_l*12, 0.0));
    swordArr.push(translate(scaling_l*12, scaling_l*12, 0.0));
    swordArr.push(translate(scaling_l*6, scaling_l*12, 0.0));
    swordArr.push(translate(scaling_l*14, scaling_l*12, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*18, 0.0));


    for (var weaponDarkGrayInc=weaponHandleInc; weaponDarkGrayInc<weaponHandleInc+11; weaponDarkGrayInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(swordArr[weaponDarkGrayInc], ctm);
        ctm = mult(sword_rm, ctm);
        ctMatrices.push(ctm);
        colors.push(vec3(105/255, 105/255, 105/255));  //face color
    }


    swordArr.push(translate(scaling_l*8, scaling_l*18, 0.0));
    swordArr.push(translate(scaling_l*12, scaling_l*18, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*20, 0.0));
    swordArr.push(translate(scaling_l*12, scaling_l*20, 0.0));
    swordArr.push(translate(scaling_l*8, scaling_l*20, 0.0));
    swordArr.push(translate(scaling_l*10, scaling_l*22, 0.0));
    swordArr.push(translate(scaling_l*12, scaling_l*16, 0.0));
    swordArr.push(translate(scaling_l*8, scaling_l*16, 0.0));
    swordArr.push(translate(scaling_l*12, scaling_l*14, 0.0));
    swordArr.push(translate(scaling_l*8, scaling_l*14, 0.0));

    for (var weaponLightGrayInc=weaponDarkGrayInc; weaponLightGrayInc<weaponDarkGrayInc+10; weaponLightGrayInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(swordArr[weaponLightGrayInc], ctm);
        ctm = mult(sword_rm, ctm);
        ctMatrices.push(ctm);
        colors.push(vec3(123/255, 123/255, 123/255));  //face color
    }

}



//swings viking sword
function swing_sword() {

    //calculates bounds of the sword
    swordFrontX = x_viking + scaling_l*16;
    swordBackX = x_viking + scaling_l;
    swordTopY = y_viking + 8*scaling_l;
    swordBottomY = y_viking - 8*scaling_l;
    var sword_rm = rotateZ(0);
    
    
    if (swordSwing == "True") {

        swordTheta += swordThetaInc;
        swordThetaCount += 1;
        sword_rm = rotateZ(swordTheta);

        //once sword swings done, reverse its swing direction
        if (swordTheta == -90) {
            swordThetaInc = -swordThetaInc;
        }

        //once sword swing is done, set swordSwing to False
        if (swordTheta == 0 && swordThetaCount > 5) {
            swordSwing = "False";
        }

        //checks if sword is currently coming into contact with an weak enmies
        for (var i = 0; i < weak_enemies.length; i++) {
            if (weak_enemies[i]['x_enemy'] >= swordBackX && weak_enemies[i]['x_enemy'] <= swordFrontX && weak_enemies[i]['y_enemy'] >= swordBottomY && weak_enemies[i]['y_enemy'] <= swordTopY) {
                
                if (weak_enemies[i]['enemyHit'] == false) {
                    weak_enemies[i]['enemyHit'] = true;
                    weak_enemies[i]['lives'] -= 1;
                    if (weak_enemies[i]['lives'] == 0) {
                        weak_enemies[i]['trigger'] = false;
                    }

                }
            }
        }

        //checks if sword is currently coming into contact with an strong enmies  
        for (var i = 0; i < strong_enemies.length; i++) {
            if (strong_enemies[i]['x_enemy'] >= swordBackX && strong_enemies[i]['x_enemy'] <= swordFrontX && strong_enemies[i]['y_enemy'] >= swordBottomY && strong_enemies[i]['y_enemy'] <= swordTopY) {
               
                if (strong_enemies[i]['enemyHit'] == false) {
                    strong_enemies[i]['enemyHit'] = true;
                    strong_enemies[i]['lives'] -= 1;
                 
                    if (strong_enemies[i]['lives'] == 0) {
                        strong_enemies[i]['trigger'] = false;
                    }

                }
            }
        }
    }


    //update ct Matrices for all sword pixels based on how much to swing the sword
    for (var weaponHandleInc=0; weaponHandleInc<8; weaponHandleInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        
        ctm = mult(swordArr[weaponHandleInc], ctm);
        ctMatrices[51 + weaponHandleInc] = mult(sword_rm, ctm);
    }

    for (var weaponDarkGrayInc=weaponHandleInc; weaponDarkGrayInc<weaponHandleInc+11; weaponDarkGrayInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(swordArr[weaponDarkGrayInc], ctm);
        ctMatrices[51 + weaponDarkGrayInc] = mult(sword_rm, ctm);

        
    }

    for (var weaponLightGrayInc=weaponDarkGrayInc; weaponLightGrayInc<weaponDarkGrayInc+10; weaponLightGrayInc++) {
        ctm = mat4();   
        ctm = mult(sm, ctm);
        ctm = mult(swordArr[weaponLightGrayInc], ctm);
        ctMatrices[51 + weaponLightGrayInc] = mult(sword_rm, ctm);
    }

}



//process viking jumping
function viking_jump() {

    //update viking y position and jump velocity
    y_viking += jump_velocity;
    jump_velocity -= .001;

    //if viking has reached floor, end jump
    var curr_floor = Math.max(y_floor, platform_y)
   
    if (y_viking <= curr_floor) {
        y_viking = curr_floor;
        jump_velocity = 0;
        jumping = "False";
        double_jump = "False"
    } else if (y_viking >= y_ceiling) {
        y_viking = y_ceiling;
        jump_velocity = -.00001;
    }
}



//draws both viking and its sword
function draw_viking_and_sword() {

    mvMatrix = translate(x_viking, y_viking, 0.0);
    gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));


    var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);    // o

    for (var j=0; j<14; j++) { 
        gl.uniform3fv( u_baseColorLoc, colors[j]);  // ND logo
        ctm = mult(pm, ctMatrices[j]);
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }
    for (var k=skinInc; k<skinInc+10; k++) { 
        gl.uniform3fv( u_baseColorLoc, colors[k]);  // ND logo
        ctm = mult(pm, ctMatrices[k]);
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }
    for (var p=darkGrayInc; p<darkGrayInc+8; p++) { 
        gl.uniform3fv( u_baseColorLoc, colors[p]);  // ND logo
        ctm = mult(pm, ctMatrices[p]);
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }
    for (var q=lightGrayInc; q<lightGrayInc+4; q++) { 
        gl.uniform3fv( u_baseColorLoc, colors[q]);  // ND logo
        ctm = mult(pm, ctMatrices[q]);
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }
    for (var y=blackInc; y<blackInc+15; y++) { 
        gl.uniform3fv( u_baseColorLoc, colors[y]);  // ND logo
        ctm = mult(pm, ctMatrices[y]);
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }
    for (var z=brownInc; z<brownInc+8; z++) { 
        gl.uniform3fv( u_baseColorLoc, colors[z]);  // ND logo
        ctm = mult(pm, ctMatrices[z]);
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }
    for (var q=z; q<z+11; q++) { 
        gl.uniform3fv( u_baseColorLoc, colors[q]);  // ND logo
        ctm = mult(pm, ctMatrices[q]);
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }
    for (var t=q; t<q+10; t++) { 
        gl.uniform3fv( u_baseColorLoc, colors[t]);  // ND logo
        ctm = mult(pm, ctMatrices[t]);
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }
}



//draws all enemies that are currently triggered
function draw_enemy() { 

    for (var i = 0; i < weak_enemies.length; i++) {
   
        //checks if the current weak enemy is triggered
        if (weak_enemies[i]['trigger'] == true) {
            if (weak_enemies[i]['justSpawned']) {
                weak_enemies[i]['enemyHit'] = false;
                weak_enemies[i]['x_enemy'] = weak_enemies[i]['x_spawn']+1.1;
                weak_enemies[i]['y_enemy'] = weak_enemies[i]['y_spawn'];
                weak_enemies[i]['justSpawned'] = false;
                weak_enemies[i]['lives'] = 1;
                
            }

            
            //updates enemy x position to be closer to viking
            if (x_viking < weak_enemies[i]['x_enemy']-0.02) {
                weak_enemies[i]['x_enemy'] = weak_enemies[i]['x_enemy'] - 0.002;
            }
            else if (x_viking > weak_enemies[i]['x_enemy']+0.02) {
                weak_enemies[i]['x_enemy'] = weak_enemies[i]['x_enemy'] + 0.002;
            }

            //checks if enemy is currently in contact with viking
            if (Math.abs(weak_enemies[i]['x_enemy'] - x_viking) < 0.04 && Math.abs(weak_enemies[i]['y_enemy'] - y_viking) < 0.08 && invicibleTime <= 0) {
                num_lives -= 1;
                invicibleTime = 0.5;
                
            }

            //updates platform position of current enemy
            weak_enemies[i]['platform_y'] = y_floor;

            var rounded_x = (Math.round(weak_enemies[i]['x_enemy'] / 0.01) * 0.01).toFixed(2);

            var platform_start = -2.0;
            var platform_end = 20.0;

            if (rounded_x in platforms) {
                if (weak_enemies[i]['y_enemy'] >= platforms[rounded_x]['y']) {
                    weak_enemies[i]['platform_y'] = platforms[rounded_x]['y'];
                }  
                var platform_start = platforms[rounded_x]['start'];
                var platform_end = platforms[rounded_x]['end'];
            }
            
            //checks if enemy is not on either a platform or the floor
            if (weak_enemies[i]['y_enemy'] > Math.max(weak_enemies[i]['platform_y'], y_floor) && weak_enemies[i]['y_velocity'] == 0) {
                if (weak_enemies[i]['falling'] == true) {
                    weak_enemies[i]['y_velocity'] = -0.005;
                } else {
                    if (weak_enemies[i]['x_enemy'] >= platform_end) {
                        weak_enemies[i]['x_enemy'] = platform_end

                    } else if (weak_enemies[i]['x_enemy'] <= platform_start) {
                        weak_enemies[i]['x_enemy'] = platform_start
                    }
                }
            }

            //updates viking falling position
            if (weak_enemies[i]['y_velocity'] < 0) {
                
                weak_enemies[i]['y_enemy'] += weak_enemies[i]['y_velocity'];
                weak_enemies[i]['y_velocity'] -= 0.0001;

                if (weak_enemies[i]['y_enemy'] <= Math.max(weak_enemies[i]['platform_y'], y_floor)) {
                    weak_enemies[i]['y_velocity'] = 0;
                    weak_enemies[i]['y_enemy'] = Math.max(weak_enemies[i]['platform_y'], y_floor);
                }
            }

            //draws current enemy
            mvMatrix = translate(weak_enemies[i]['x_enemy'], weak_enemies[i]['y_enemy'], 0.0);
            gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
            var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);

            for (var b=0; b<4; b++) { 
                gl.uniform3fv( u_baseColorLoc, enemyColors[b]);  // ND logo
                ctm = mult(pm, enemyCTMatrices[b]);
                gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
                gl.drawArrays( gl.TRIANGLES, 0, 6 );
            }

            for (var c=4; c<27; c++) { 
                gl.uniform3fv( u_baseColorLoc, enemyColors[c]);  // ND logo
                ctm = mult(pm, enemyCTMatrices[c]);
                gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
                gl.drawArrays( gl.TRIANGLES, 0, 6 );
            }

            for (var c=27; c<40; c++) { 
                gl.uniform3fv( u_baseColorLoc, enemyColors[c]);  // ND logo
                ctm = mult(pm, enemyCTMatrices[c]);
                gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
                gl.drawArrays( gl.TRIANGLES, 0, 6 );
            }
        }
    }

    for (var i = 0; i < strong_enemies.length; i++) {
    
        //checks if the current strong enemy is triggered
        if (strong_enemies[i]['trigger'] == true) {
            if (strong_enemies[i]['justSpawned']) {
                strong_enemies[i]['enemyHit'] = false;
                strong_enemies[i]['x_enemy'] = strong_enemies[i]['x_spawn']+1.1;
                strong_enemies[i]['y_enemy'] = strong_enemies[i]['y_spawn'];
                strong_enemies[i]['justSpawned'] = false;
                strong_enemies[i]['lives'] = 2;
                //enemyWeakTrigger = false;
                
            }

        
            //updates enemy x position to be closer to viking
            if (x_viking < strong_enemies[i]['x_enemy']-0.02) {
                strong_enemies[i]['x_enemy'] = strong_enemies[i]['x_enemy'] - 0.002;
            }
            else if (x_viking > strong_enemies[i]['x_enemy']+0.02) {
                strong_enemies[i]['x_enemy'] = strong_enemies[i]['x_enemy'] + 0.002;
            }

            //checks if enemy is currently in contact with viking
            if (Math.abs(strong_enemies[i]['x_enemy'] - x_viking) < 0.04 && Math.abs(strong_enemies[i]['y_enemy'] - y_viking) < 0.08 && invicibleTime <= 0) {
                num_lives -= 1;
                invicibleTime = 0.5;
                
            }


            //updates platform position of current enemy
            strong_enemies[i]['platform_y'] = y_floor;

            var rounded_x = (Math.round(strong_enemies[i]['x_enemy'] / 0.01) * 0.01).toFixed(2);

            var platform_start = -2.0;
            var platform_end = 20.0;

            if (rounded_x in platforms) {
                if (strong_enemies[i]['y_enemy'] >= platforms[rounded_x]['y']) {
                    strong_enemies[i]['platform_y'] = platforms[rounded_x]['y'];
                }  
                var platform_start = platforms[rounded_x]['start'];
                var platform_end = platforms[rounded_x]['end'];
            }


            //checks if enemy is not on either a platform or the floor
            if (strong_enemies[i]['y_enemy'] > Math.max(strong_enemies[i]['platform_y'], y_floor) && strong_enemies[i]['y_velocity'] == 0) {
                if (strong_enemies[i]['falling'] == true) {
                    strong_enemies[i]['y_velocity'] = -0.005;
                } else {
                    if (strong_enemies[i]['x_enemy'] >= platform_end) {
                        strong_enemies[i]['x_enemy'] = platform_end

                    } else if (strong_enemies[i]['x_enemy'] <= platform_start) {
                        strong_enemies[i]['x_enemy'] = platform_start
                    }
                }
            }


            //updates viking falling position
            if (strong_enemies[i]['y_velocity'] < 0) {
                

                strong_enemies[i]['y_enemy'] += strong_enemies[i]['y_velocity'];
                strong_enemies[i]['y_velocity'] -= 0.0001;

                if (strong_enemies[i]['y_enemy'] <= Math.max(strong_enemies[i]['platform_y'], y_floor)) {
                    strong_enemies[i]['y_velocity'] = 0;
                    strong_enemies[i]['y_enemy'] = Math.max(strong_enemies[i]['platform_y'], y_floor);
                }
            }
        

            //draws current enemy
            mvMatrix = translate(strong_enemies[i]['x_enemy'], strong_enemies[i]['y_enemy'], 0.0);
            gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
            var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);

            for (var b=0; b<4; b++) { 
                gl.uniform3fv( u_baseColorLoc, enemyColors[b+40]);  // ND logo
                ctm = mult(pm, enemyCTMatrices[b+40]);
                gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
                gl.drawArrays( gl.TRIANGLES, 0, 6 );
            }

            for (var c=4; c<27; c++) { 
                gl.uniform3fv( u_baseColorLoc, enemyColors[c+40]);  // ND logo
                ctm = mult(pm, enemyCTMatrices[c+40]);
                gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
                gl.drawArrays( gl.TRIANGLES, 0, 6 );
            }

            for (var c=27; c<40; c++) { 
                gl.uniform3fv( u_baseColorLoc, enemyColors[c+40]);  // ND logo
                ctm = mult(pm, enemyCTMatrices[c+40]);
                gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
                gl.drawArrays( gl.TRIANGLES, 0, 6 );
            }
        }
    }
}



//draws back barrier wall 
function draw_barrier_wall() {
 
    //mark texture flag as 1
    gl.uniform1i(u_drawTexture, 1);

    //activate texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, floorTexture );

    var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);    // o
    
    //draw back wall
    var y;
    for (y = -1.0; y <= 1.0; y += 0.3) {

        for (var x = 0; x < 2; x++) {

            mvMatrix = translate(-1.0 - floor_block_size/2 - x* floor_block_size, y, 0.0);
            gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
            
            ctm = mult(pm, scalem(floor_block_size,0.3,1.0));
            gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
            gl.drawArrays( gl.TRIANGLES, 0, 6 );
        }
    }

    //set texture flag back to 0
    gl.uniform1i(u_drawTexture, 0);

}



//draw floor
function draw_floor_and_ceiling() {

    //mark texture flag as 1
    gl.uniform1i(u_drawTexture, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, floorTexture );
    gl.uniform4fv(u_texBaseColorLoc, vec4(1,1,1,1.0 ));

    var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);    // o

    //draw floor from first_texture_x to last_texture_x
    var x;

    for (x = first_texture_x; x <= last_texture_x + floor_block_size; x += floor_block_size) {
        
        gl.uniform4fv(u_texBaseColorLoc, vec4(1,1,1,1.0 ));
       
        
        mvMatrix = translate(x, -0.86, 0.0);
        gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
        
        ctm = mult(pm, scalem(floor_block_size,0.3,1.0));
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );



        mvMatrix = translate(x, 1.1, 0.0);
        gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
        ctm = mult(pm, scalem(floor_block_size,0.3,1.0));
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }

    //set texture flag back to zero
    gl.uniform1i(u_drawTexture, 0);

}



//draw background
function draw_background()  {

    var background_opacity = 0.7;

    //mark texture flag as 1
    gl.uniform1i(u_drawTexture, 1);
    //update base texture color to have a different opacity (for lighter color)
    gl.uniform4fv(u_texBaseColorLoc, vec4(1.0, 1.0, 1.0, background_opacity));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, backgroundTexture );

    background_shift += 0.0001;

    //resest backgorund shift once it is larger than background
    if (background_shift >= background_block_size) {
        background_shift = 0.0;
    }
  
    //draw floor from first_texture_x to last_texture_x
    //var x;
    var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);    // o
    for (var x = first_texture_x; x <= last_texture_x + background_block_size; x += background_block_size) {

        mvMatrix = translate(x - background_shift, .22, 0.0);
        gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
        
        ctm = mult(pm, scalem(background_block_size, 0.792, 0.0));
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );
    }

    //set texture flag back to zero
    //reset base texture color
    gl.uniform4fv(u_texBaseColorLoc, vec4(1.0,1.0,1.0,1.0));
    gl.uniform1i(u_drawTexture, 0);
}



//draw hearts (one for each life remaining)
function draw_hearts() {

    var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);    // o
    
   
    //set color to red
    gl.uniform3fv( u_baseColorLoc, vec3(1.0,0,0));  

    ctm = mult(pm, scalem(0.05, 0.05, 0.05));
    /* ctm = mat4();
    ctm = mult(sm, ctm);
    ctm = mult(pm, ctm); */

    gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));

    
    //bind heart buffer
    gl.bindBuffer( gl.ARRAY_BUFFER, heartBuffer );
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.vertexAttribPointer( a_vTexCoordLoc, 2, gl.FLOAT, false, 0, 0 );

    //draw hearts
    for (var i = 0; i < num_lives; i++) {
        
        //shift heart to correct location
        mvMatrix = translate(x_viking - 0.9 + i * .14, .75, 0.0);
        //mvMatrix = translate(x_viking, .75, 0.0);
        gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));

        gl.drawArrays( gl.TRIANGLE_FAN, 0, heartVertices.length);
    }
    if (lifeCollected[0] == false) {
        gl.uniform3fv( u_baseColorLoc, vec3(1.0,0.1,1));
        ctm = mult(pm, scalem(0.025, 0.025, 0.05));
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        mvMatrix = translate(5.25, 0.37, 0.0);
        gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
        gl.drawArrays( gl.TRIANGLE_FAN, 0, heartVertices.length);
    }

    //reset vertex an texture buffers
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.vertexAttribPointer( a_vTexCoordLoc, 2, gl.FLOAT, false, 0, 0 );

}


//update's viking's current position
function update_viking_position() {

    //checks if movement keys are currnetly being pressed
    read_movement_keys();
 

    //ONLY FOR TESTING REMOVE LATER
    //Removes life if viking hits back barrier
    if (x_viking - scaling_l * 2 <= -1) {
        num_lives -= 1;
        x_viking = x_start - 0.4;
    }

    if (y_viking > Math.max(platform_y, y_floor) && jumping == "False") {
        jumping = "True"
        jump_velocity = 0.0;
    }

    if (lifeCollected[0] == false && Math.abs(x_viking - 5.25) < 0.08 && Math.abs(y_viking - 0.37) < 0.08) {
        lifeCollected[0] = true;
        num_lives += 1;
    }

    //update character position if currently being moved
    if (move_r == "True") {
        right_movement += .005;
        x_viking += .005;
        if (right_movement >= .015) {
            move_r = "False";
            right_movement = 0.0;
            
            //if viking gets close to last_texture_x, shift last_texture_x and first_texture_x to improve efficiency
            if (x_viking >= (last_texture_x - background_block_size)) {
            last_texture_x += background_block_size;
            first_texture_x += background_block_size;
            }
        }
    }


    if (move_l== "True") {
        left_movement += .005;
        x_viking -= .005;
        if (left_movement >= .015) {
            move_l= "False";
            left_movement = 0.0;
        }

        //ensures viking doesn't move past back bariier wall
        if (x_viking <= -1.0) {
            x_viking = -1.0;
        }
    
        //if viking gets close to last_texture_x, shift last_texture_x and first_texture_x to improve efficiency
        if (x_viking <= (first_texture_x + background_block_size)) {
            last_texture_x -= background_block_size;
            first_texture_x -= background_block_size;
        }
    }


    platform_y = y_floor;

    //checks if viking is at pole
    if (x_viking >= pole_x - 0.085) {

        if (y_viking == y_floor) {
            x_viking = pole_x - 0.085
        } 
        
        if (x_viking >= pole_x - 0.06){
            platform_y = -.32;
        }


        if (x_viking - scaling_l >= pole_x) {
            gameWon = "True";
        }
    }


    //sets plaform_y if viking is at the same x position as a platform
    var rounded_x = (Math.round(x_viking / 0.01) * 0.01).toFixed(2);

    if (rounded_x in platforms) {
        if (y_viking >= platforms[rounded_x]['y']) {
            platform_y = platforms[rounded_x]['y'];
        }  
    }

}



//draws the end wall and end flag pole
function draw_end() {
    //mark texture flag as 1
    gl.uniform1i(u_drawTexture, 1);

    //activate wall texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, floorTexture );

    var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);    // o
    
    //draw end wall
    var y;
    for (y = -1.0; y <= 1.0; y += 0.3) {

        for (var x = 0; x < 2; x++) {

            mvMatrix = translate(pole_x + 0.75 + x * floor_block_size, y, 0.0);
            gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
            
            ctm = mult(pm, scalem(floor_block_size,0.3,1.0));
            gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
            gl.drawArrays( gl.TRIANGLES, 0, 6 );
        }
    }


    //activate pole texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, poleTexture );

    //draw end pole
    mvMatrix = translate(pole_x, 0.06, 0.0);
    gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
            
    ctm = mult(pm, scalem(0.25, 0.62, 1.0));
    gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
    gl.drawArrays( gl.TRIANGLES, 0, 6 );

    //set texture flag back to 0
    gl.uniform1i(u_drawTexture, 0);
    

}



//creates a platform at heihgt y that spans from x_start to x_end
function create_platform(x_start, x_end, y) {
    for (var i = x_start; i < x_end +0.01; i += 0.01) {
        var rounded_x = (Math.round(i / 0.01) * 0.01).toFixed(2);
        platforms[rounded_x] = {}
        platforms[rounded_x]['y'] = y + 0.16;
        platforms[rounded_x]['start'] = x_start;
        platforms[rounded_x]['end'] = x_end;
    }

    platformArr.push([x_start, x_end, y]);
}



//creates all platforms in the game
function setup_platforms(){

    create_platform(0.0, 0.8, -0.15);
    create_platform(1.0, 1.5, .10);
    create_platform(1.75, 2.0, .30);
    create_platform(2.5, 3.0, 0.05);
    create_platform(3.5, 3.85, -0.20);
    create_platform(4.25, 4.45, -0.05);
    create_platform(4.65, 4.95, 0.15);
    create_platform(5.15, 5.35, 0.25);
    create_platform(5.6, 5.95, 0.10);
    create_platform(7.45, 7.55, -0.15);
    create_platform(7.75, 7.85, 0.15);

}



//draws all platforms in the game
function draw_platforms() {
    //mark texture flag as 1
    gl.uniform1i(u_drawTexture, 1);

    
    gl.uniform3fv( u_baseColorLoc, vec3(0.0, 0.0, 0.0));  
    var pm =  ortho(-2, 2, -1.0, 1.0, -1.0, 1.0);    // o

    //activate floor texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture( gl.TEXTURE_2D, floorTexture );
    gl.uniform4fv(u_texBaseColorLoc, vec4(0.5,0.5,0.5,1.0 ));
   

    //draws all platforms
    for (var i = 0; i < platformArr.length; i ++) {

        var x_start = platformArr[i][0];
        var x_end = platformArr[i][1];
        var y = platformArr[i][2];

        mvMatrix = translate((x_start + x_end)/2, y, 0.0);
        gl.uniformMatrix4fv(u_mvMatrixLoc, false, flatten(mvMatrix));
                
        ctm = mult(pm, scalem(x_end - x_start,0.05,1.0));
        gl.uniformMatrix4fv(u_ctmLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLES, 0, 6 );

    }


    gl.uniform4fv(u_texBaseColorLoc, vec4(1.0,1.0,1.0,1.0));
    //set texture flag back to 0
    gl.uniform1i(u_drawTexture, 0);

}



//creates an instance of a weak enemy
function create_weak_enemy(x_spawn, y_spawn, falling) {
    var enemy_dict = {}
    enemy_dict['spawn'] = false;
    enemy_dict['justSpawned'] = false;
    enemy_dict['x_spawn'] = x_spawn;
    enemy_dict['y_spawn'] = y_spawn;
    enemy_dict['falling'] = falling;
    enemy_dict['platform_y'] = y_floor;
    enemy_dict['y_velocity'] = 0;

    weak_enemies.push(enemy_dict);
}



//creates an instance of a strong enemy
function create_strong_enemy(x_spawn, y_spawn, falling) {
    var enemy_dict = {}
    enemy_dict['spawn'] = false;
    enemy_dict['justSpawned'] = false;
    enemy_dict['x_spawn'] = x_spawn;
    enemy_dict['y_spawn'] = y_spawn;
    enemy_dict['falling'] = falling;
    enemy_dict['platform_y'] = y_floor;
    enemy_dict['y_velocity'] = 0;

    strong_enemies.push(enemy_dict);
}



//creates all enemies in the game
function create_enemies() {
    create_weak_enemy(-0.8, 0.03, true);
    create_weak_enemy(-0.5, 0.01, false);
    create_weak_enemy(0.0, y_floor, true);
    create_weak_enemy(0.5, y_floor, true);
    create_weak_enemy(1.0, y_floor, true);
    create_weak_enemy(1.5, 0.3, true);
    create_weak_enemy(3.7, 0.311, false);
    create_weak_enemy(4.2, 0.311, true);
    create_weak_enemy(4.25, 0.5, true);
    create_weak_enemy(6.0, y_floor, true);
    create_weak_enemy(5.8, y_floor, true);
    create_weak_enemy(6.0, y_floor, true);
    create_weak_enemy(6.6, y_floor, true);

    create_strong_enemy(-0.2, 0.5, true);
    create_strong_enemy(0.2, 0.5, true);
    create_strong_enemy(2.0, 0.5, true);
    create_strong_enemy(3.5, y_floor, true);
    create_strong_enemy(2.6, 0.0, true);
    create_strong_enemy(4.5, 0.263, false);
    create_strong_enemy(5.9, y_floor, true);
    create_strong_enemy(6.5, y_floor, true);
    create_strong_enemy(6.8, y_floor, true);

}



function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
 

    //checks if viking is close enough to any weak enemies for them to spawn
    for (var i = 0; i < weak_enemies.length; i++) {
        if (x_viking > weak_enemies[i]['x_spawn'] - 0.2 && weak_enemies[i]['spawn'] == false) {
            weak_enemies[i]['trigger'] = true;
            weak_enemies[i]['justSpawned'] = true;
            weak_enemies[i]['spawn'] = true;
        }
    }

    //checks if viking is close enough to any strong enemies for them to spawn
    for (var i = 0; i < strong_enemies.length; i++) {
        if (x_viking > strong_enemies[i]['x_spawn'] - 0.2 && strong_enemies[i]['spawn'] == false) {
            strong_enemies[i]['trigger'] = true;
            strong_enemies[i]['justSpawned'] = true;
            strong_enemies[i]['spawn'] = true;
        }
    }


    update_viking_position();


    //check for game over
    if (num_lives == 0) {
        alert("Game Over!\n\nRefresh window to restart.")
        return;
    }

    //check if game has been won
    if (gameWon == "True" && y_viking > 0.40) {
        alert("1UP!\n\nRefresh window to restart.")
        return;
    }
    if (gameWon == "True") {
        alert("You win!\n\nRefresh window to restart.")
        return;
    }

    //move projection matrix so viking is in center of projection matrix
    projMatrix = ortho(x_viking - 1.0, x_viking + 1.0, -1, 1, -1, 1)
    gl.uniformMatrix4fv(u_projMatrixLoc, false, flatten(projMatrix));
    

    if (swordSwing == "True") {
        swing_sword();
    } 
    else {
        //if sword is not being swung, set all strong enemies to not being currently hit
        for (var i = 0; i < strong_enemies.length; i++){
            strong_enemies[i]['enemyHit'] = false;
        }
    }


    if (jumping == "True") {
        viking_jump();
    }

    draw_background();
    draw_floor_and_ceiling();
    draw_platforms();

    //draw_barrier wall is viking is close to it
    if (x_viking < 1.0) {
        draw_barrier_wall();
    }

    //draws end if viking is close to it
    if (x_viking > 3.75) {
        draw_end();
    }


    draw_enemy();
    draw_viking_and_sword();
    draw_hearts();

    if (invicibleTime > 0) {
        invicibleTime = invicibleTime - 0.0125;
    }


    setTimeout(function(){requestAnimationFrame(render);}, 0)
}
