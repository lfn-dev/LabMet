* Original author Chihiro Kodama
* [june 2024] Script retrieved from:
*   http://kodama.fubuki.info/wiki/wiki.cgi/GrADS/script/color.gs?lang=en
*
* Modified by Lucas Nogueira 2025



*
* Help is in the end of this script
*
function color( args )
* Modified version, based on '0.08r2'.
  orig='0.08r2'
 _version = orig'm.0.51'
  rc = gsfallow( 'on' )

  if( args = '' )
    help()
    return
  endif

***** Default value *****
*  gxout  = ''
  gxout  = 'shaded'
  kind   = 'blue->white->red'
  alpha  = 255
  sample = -1
  var    = 'none'
  min    = 'none'
  max    = 'none'
  int    = 'none'
  inttype= 'none'
  div    = 10
  levs   = ''
  xcbar  = 'none'
  retflag = 0
  _verbose = 0

**
  sampleall  = 0
  maxsamples = 9
  _usergb = 0
**

***** Arguement *****
  i = 1
  while( 1 )
    arg = subwrd( args, i )
    i = i + 1;
    if( arg = '' ); break; endif

    while( 1 )
*** option
      if( arg = '-gxout' ) ; gxout=subwrd(args,i) ; i=i+1 ; break ; endif
      if( arg = '-kind' )  ; kind=subwrd(args,i)  ; i=i+1 ; break ; endif
      if( arg = '-alpha' ) ; alpha=subwrd(args,i) ; i=i+1 ; break ; endif
      if( arg = '-div' )   ; div=subwrd(args,i)   ; i=i+1 ; break ; endif
      if( arg = '-sample' ); sample=1   ; break   ; endif
      if( arg = '-ret' )   ; retflag=1  ; break   ; endif
      if( arg = '-var' )   ; var=subwrd(args,i)   ; i=i+1 ; break ; endif
      if( arg = '-verbose' | arg = '-v' ); _verbose=1     ; break ; endif

* Lucas Nogueira
* -- Added options:
      if( arg = '-use-rgb')           ; _usergb   = 1  ; break   ; endif
      if( arg = '-use-rev')           ; samplerev = 1  ; break   ; endif
      if( arg = '-sample-default')    ; sampleall = 1  ; break   ; endif
      if( arg = '-sample-sequential') ; sampleall = 2  ; break   ; endif
      if( arg = '-sample-diverging')  ; sampleall = 3  ; break   ; endif
      if( arg = '-sample-linear')     ; sampleall = 4  ; break   ; endif
      if( arg = '-sample-seaborn')    ; sampleall = 5  ; break   ; endif
      if( arg = '-show-all')          ; list_colors()  ; return  ; endif

      if( arg = '-sample-pos' )       ; sample=subwrd(args,i)    ; i=i+1 ; break; endif
      if( arg = '-max-samples' )      ; maxsamples=subwrd(args,i); i=i+1 ; break; endif
* --

      if( arg = '-levs' )
        while( 1 )
          arg = subwrd( args, i )
          if( valnum(arg) = 0 ) ; break ; endif
          levs = levs % ' ' % arg
          i = i + 1
        endwhile
        break
      endif

*** int, max, min
      if( min != 'none' & max != 'none' & int != 'none' & inttype = 'none' )
        inttype = arg
        break
      endif
      if( valnum(arg) != 0 & min != 'none' & max != 'none' & int = 'none' )
        int = arg
        break
      endif
      if( valnum(arg) != 0 & min != 'none' & max = 'none' )
        max = arg
        break
        endif
      if( valnum(arg) != 0 & min = 'none' )
        min = arg
        break
      endif

      if( arg = '-xcbar' )
        xcbar = ''
        break        
      endif

      say 'syntax error: 'arg
      return

    endwhile

    if( xcbar = '' ) ; break; endif
  endwhile

  if( xcbar = '' )
    start = 0
    end   = math_strlen( args )
* order of the word
    word = 0
* previous character (0:space 1:word)
    pre = 0

    while( start < end )
      start = start + 1

      c = substr( args, start, 1 )
      if( c != ' ' & pre = 0 )
        word = word + 1
        pre = 1
      else
        if( c = ' ' & pre = 1 )
          pre = 0
        endif
      endif
      if( word = i ) ; break; endif
      if( start = end ) ; start = -1 ; break ; endif
    endwhile

    if( start < 1 )
      xcbar = '1 10 0.5 0.8 -line -edge triangle'
    else
      xcbar = substr( args, start, end-start+1 )
    endif
  endif


***** Parameter adjust *****

*** var -> min, max, int
  if( var != 'none' & ( min = 'none' | max = 'none' ) )

*   get min & max value of the variable
    i = 1
    while( i <= 4 )
      'q dims'
      line = sublin( result, i+1 )
      name.i = subwrd( line, 1 )
      type.i = subwrd( line, 3 )
      if( type.i = 'varying' )
        min.i = subwrd( line, 11 )
        max.i = subwrd( line, 13 )
      else
        min.i = subwrd( line, 9 )
        max.i = subwrd( line, 9 )
      endif
      i = i + 1
    endwhile

    j = 1
    while( j <= 2 )
      head.j = ''
      tail.j = ''
      i = 1
      while( i <= 4 )
        if( j = 1 ) ; head.j = 'min( '  % head.j 
        else        ; head.j = 'max( '  % head.j ; endif
        tail.j = tail.j % ', ' % name.i % '=' % min.i % ', ' % name.i % '=' max.i % ' )'
        i = i + 1
      endwhile

      'd 'head.j' 'var' 'tail.j
      i = 1
      while( 1 )
        line = sublin( result, i )
        word = subwrd( line, 1 )
        if( word = 'Result' ) ; break ; endif
        if( word = '' ) ; exit ; endif
        i = i + 1
      endwhile
      val = subwrd( line, 4 )
*      say val
      
      if( j = 1 ) ; minval = val
      else        ; maxval = val ; endif

      j = j + 1
    endwhile

    if( minval = maxval )
      say 'Constant Field: ' % minval
      exit
    endif

*   determine contour interval following gagx.c, L5066
    rdif = ( maxval - minval ) / 10.0
    w2 = math_int( math_log10( rdif ) )
    w1 = math_pow( 10.0, w2 )
    norml = rdif / w1

    int = 0.0
    if( int = 0.0 & norml >= 1.0 & norml <= 1.5 ) ; int = 1.0 ; endif
    if( int = 0.0 & norml >  1.5 & norml <= 2.5 ) ; int = 2.0 ; endif
    if( int = 0.0 & norml >  2.5 & norml <= 3.5 ) ; int = 3.0 ; endif
    if( int = 0.0 & norml >  3.5 & norml <= 7.5 ) ; int = 5.0 ; endif
    if( int = 0.0 ) ; int = 10.0 ; endif
    int = int * w1
    min = int * math_int( minval / int + 1.0 )
    max = int * math_int( maxval / int )

    say 'min='min' max='max' int='int
  endif

*** min, max -> int
  if( min != 'none' & max != 'none' & int = 'none' )
    int = ( max - min ) / div
    say 'min='min' max='max' int='int
  endif

*** special kind
  kind = spcol( kind )

***** Parameter check *****

  if( ( valnum(min)=0 | valnum(max)=0 | valnum(int)=0 ) & levs='' )
    say 'error in colog.gs: cannot determine color levels'
    return
  endif
  if( valnum(min)!=0 & valnum(max)!=0 & valnum(int)!=0 & levs!='' )
    say 'error in color.gs: multiple definition of color levels'
    return
  endif
  if( inttype = 'fac' & int <= 1 )
    say 'error in colog.gs: interval should be greater than 1 when inttype="fac"'
    return
  endif

***** Calculate levels *****
  if( levs = '' )

*** get levs & colnum
    value = min
    colnum = 0
    levs = ''

    while( value <= max )
      levs = levs % ' ' % value
      if( inttype = 'fac' )
        value = value * int
      else
        value = value + int
      endif
      colnum = colnum + 1
    endwhile

  else

*** get colnum
    colnum = 0
    while( subwrd(levs,colnum+1) != '' )
      colnum = colnum + 1
    endwhile

  endif

*** get cols
  i = 1
  cols = ''
  while( i <= colnum )
    cols = cols % ' ' % (i+15)
    i = i + 1
  endwhile

*** get gxout if necessary, or set gxout
*  if( gxout = '' )
*    gxout = qgxout( '2d-1expr' )
*    gxout = chcase( gxout, 'lower' )
**   This seems to be a GrADS's bug when mproj = nps.
*    if( gxout = '16' ) ; gxout = 'shaded' ; endif
*  else
    'set gxout 'gxout
*  endif

**** one more color if gxout=shaded etc.
  if( gxout = 'grfill' | gxout = 'shaded' | gxout = 'shade1' | gxout = 'shade2' | gxout = 'shade2b' )
    colnum = colnum + 1
    cols = cols % ' ' % (colnum+15)
  endif

***** Set levs/cols *****
  'set clevs 'levs
  'set ccols 'cols
  say 'clevs='levs
  say 'ccols='cols
  if( retflag = 1 )
    ret = 'clevs ' % levs
    ret = ret % ' ccols ' % cols
  endif
  ret = ret % ' rgb '


***** Define colors *****

*** analyze -kind
*   max    : number of color listed in -kind.
*   ncol.i : number of color between col.i and col.(i+1)
*            0 if no color exists between the two colors.
*            -1 if not specified (automatic).
    i = 1
    max = -999
    while( max != i-2 )
      col.i = getcol( kind,i )
*      say i % ': ' % col.i

      if( col.i = '' )
         max = i - 1
      else
*       get ncol.i if specified
        ncol.i = -1
        l = math_strlen( col.i )
        if( substr( col.i, l, 1 ) = ')' )
          ncol.i = ''
          l = l - 1
          while( substr( col.i, l, 1 ) != '(' & l > 1 )
            ncol.i = substr( col.i, l, 1 ) % ncol.i
            l = l - 1
          endwhile
          if( l = 1 )
            ncol.i = -1
          else
            col.i = substr( col.i, 1, l-2 )
          endif
        endif
      endif
      i = i + 1
    endwhile

*** define color
    max_ncol = max
    colnum_ncol = 0
    i = 1
    while( i <= max-1 )
*        say colnum_ncol
      if( ncol.i >= 0 )
        max_ncol = max_ncol - 1
        colnum_ncol = colnum_ncol + ncol.i + 1
      endif
      i = i + 1
    endwhile

*    say colnum
    i = 1
    while( i <= max-1 )
      if( ncol.i < 0 )
*        ncol.i = (colnum-1) / (max-1.0)-1
        ncol.i = (colnum-colnum_ncol-1) / (max_ncol-1.0)-1
      endif

*      say i % ' ' % ncol.i
      i = i + 1
    endwhile

    enum = 16
    i = 1
    while( i <= max-1 )
      ipp = i + 1
      scol = col.i
      ecol = col.ipp
      snum = enum
      enum = snum + ncol.i + 1
      if( i = max - 1 ) ; enum = 16 + colnum - 1 ; endif
*      say 'i=' % i
*      say snum' 'enum
      rgb = defcol( snum, scol, enum, ecol, alpha )
      ret = ret % rgb % ' '
      i = i + 1
    endwhile

***** display color sample *****
optrgb=''
  if(sampleall != 0)
    if(_usergb=1); optrgb='-use-rgb'; endif

    if(samplerev = 1)
      if (sampleall != 1 & sampleall != 4)
        optrev='_r'
      endif
    else
      optrev=''
    endif

** Default colors
    if(sampleall = 1)
      maxsmp=6

      cmpname.0='bluered'
      cmpname.1='rainbow'
      cmpname.2='grainbow'
      cmpname.3='redblue'
      cmpname.4='rainbow_r'
      cmpname.5='grainbow_r'
    endif

** Sequential colors
    if(sampleall = 2)
      maxsmp=5

      cmpname.0='cividis'
      cmpname.1='magma'
      cmpname.2='inferno'
      cmpname.3='plasma'
      cmpname.4='viridis'
    endif

** Diverging colors
    if(sampleall = 3)
      maxsmp=12

      cmpname.0 ='PiYG'
      cmpname.1 ='PRGn'
      cmpname.2 ='BrBG'
      cmpname.3 ='PuOr'
      cmpname.4 ='RdGy'
      cmpname.5 ='RdBu'
      cmpname.6 ='RdYlBu'
      cmpname.7 ='RdYlGn'
      cmpname.8 ='Spectral'
      cmpname.9 ='coolwarm'
      cmpname.10='bwr'
      cmpname.11='seismic'
    endif

** Linear colors
    if(sampleall = 4)
      maxsmp=6

      cmpname.0='cube1'
      cmpname.1='cubeYF'
      cmpname.2='linear_l'
      cmpname.3='cube1_r'
      cmpname.4='cubeYF_r'
      cmpname.5='linear_l_r'

    endif
** Seaborn colors
    if(sampleall = 5)
      maxsmp=6

      cmpname.0='rocket'
      cmpname.1='mako'
      cmpname.2='flare'
      cmpname.3='crest'
      cmpname.4='vlag'
      cmpname.5='icefire'

    endif

    c=colnum
    a=alpha
    i=0
    while(i < maxsmp)
      say '1 'c' 1 'optrgb' -alpha 'a' -kind 'cmpname.i % optrev' -sample-pos 'i' -max-samples 'maxsmp
      color('1 'c' 1 'optrgb' -alpha 'a' -kind 'cmpname.i % optrev' -sample-pos 'i' -max-samples 'maxsmp)
      i=i+1
    endwhile

    return
  endif



  if( sample >= 0 )
    'query gxinfo'
    
    xpagesize = sublin(result,3) 
    xpagesize = subwrd(xpagesize,6) 
    
    ypagesize = sublin(result,4)
    ypagesize = subwrd(ypagesize,6) 

** predefined variables
    recyoffset = 0.2
    txtyoffset = 0.1
    txtvsiz = recyoffset / 2
    txthsiz = txtvsiz

    xstart = 0
    dx = xpagesize / colnum
    dy = ypagesize / maxsamples

**

    if(_usergb = 1)
      label=kind
    else    
      label=_spkind
    endif

** changing character horizontal size to fit into page
    if(strlen(label)*txthsiz > xpagesize)
      txthsiz = xpagesize/strlen(label)
    endif

    i = xstart
    while( i < colnum )
      'set line 'i+16
      'draw recf 'i*dx' 'sample*dy+recyoffset' 'i*dx+dx' 'sample*dy+dy
        
      'set strsiz 'txthsiz' 'txtvsiz
      'set string 1 bl'
      'draw string 'xstart' 'sample*dy+txtyoffset' 'label

      i = i + 1
    endwhile
  endif



***** run xcbar.gs *****
  if( xcbar != 'none' )
    levcol = ''

    if( levs = '' )
      i = 1
      value = min

      while( i < colnum )
        levcol = levcol % ' ' % (i+15) % ' ' % value
        if( inttype = 'fac' )
          value = value * int
        else
          value = value + int
        endif
        i = i + 1
      endwhile
      levcol = levcol % ' ' % (i+15)

    else
      i = 1
      while( i < colnum )
        levcol = levcol % ' ' % (i+15) % ' ' % subwrd(levs,i)
        i = i + 1
      endwhile
      levcol = levcol % ' ' % (i+15)

    endif

    say '  -> xcbar 'xcbar' -levcol 'levcol
    'xcbar 'xcbar' -levcol 'levcol
  endif

  if( retflag = 1 ) ; return ret ; endif

return


**********************************************
*
* replace special color in -kind 
*
*   kind : -kind parameter
*
**********************************************
function spcol( kind )
  length = math_strlen( kind );
  i = 1
  kind2 = ''
  coltemp = ''

  _spkind=kind

  while( i <= length )
    c  = substr( kind, i, 1 )
    c2 = substr( kind, i+1, 1 )
    if( c%c2 = '->' | c%c2 = '-(' | c = '>' | c = '(' | c = ')' | i = length )
      if( i = length ) ; coltemp = coltemp % c ; c = '' ; endif

****** Chihiro's original colormaps:
      if( coltemp = 'bluered'     ) ; coltemp = 'blue->white->red' ; endif
      if( coltemp = 'rainbow'     ) ; coltemp = 'blue->aqua->lime->yellow->red' ; endif
      if( coltemp = 'rainbow_r'     ) ; coltemp = 'red->yellow->lime->aqua->blue' ; endif
      if( coltemp = 'redblue'     ) ; coltemp = 'red->white->blue' ; endif
      if( coltemp = 'grainbow'    ) ; coltemp = '(160,0,200)->(110,0,220)->(30,60,255)->(0,160,255)->(0,200,200)->(0,210,140)->(0,220,0)->(160,230,50)->(230,220,50)->(230,175,45)->(240,130,40)->(250,60,60)->(240,0,130)' ; endif
      if( coltemp = 'revgrainbow' | coltemp = 'grainbow_r') ; coltemp = '(240,0,130)->(250,60,60)->(240,130,40)->(230,175,45)->(230,220,50)->(160,230,50)->(0,220,0)->(0,210,140)->(0,200,200)->(0,160,255)->(30,60,255)->(110,0,220)->(160,0,200)' ; endif
******

****** Perceptually Uniform Sequential colormaps from Matplotlib:
if( coltemp = 'viridis' ); coltemp ='(68.09,1.24,84.00)->(58.58,82.20,139.16)->(32.53,144.57,140.39)->(94.15,201.17,97.64)->(253.28,231.07,36.70)';   endif
if( coltemp = 'plasma' );  coltemp ='(12.85,7.60,134.63)->(126.19,3.06,167.76)->(203.55,71.45,119.73)->(248.22,149.37,64.14)->(239.70,248.67,33.49)'; endif
if( coltemp = 'inferno' ); coltemp ='(0.37,0.12,3.54)->(87.08,15.89,109.50)->(187.60,55.06,84.21)->(249.50,142.27,8.91)->(252.03,254.58,164.46)';     endif
if( coltemp = 'magma' );   coltemp ='(0.37,0.12,3.54)->(80.75,18.28,123.77)->(182.68,54.82,121.20)->(251.61,136.57,97.46)->(251.70,252.82,191.12)';   endif
if( coltemp = 'cividis' ); coltemp ='(0.00,34.45,77.71)->(67.25,78.50,107.81)->(124.62,123.76,120.11)->(187.80,173.56,108.13)->(253.91,231.88,55.53)';endif
** reversed
if( coltemp = 'viridis_r' ); coltemp ='(253.28,231.07,36.70)->(91.99,200.42,98.89)->(32.83,143.63,140.56)->(59.08,81.12,138.93)->(68.09,1.24,84.00)';     endif
if( coltemp = 'plasma_r' );  coltemp ='(239.70,248.67,33.49)->(247.82,148.00,65.01)->(202.61,70.32,120.64)->(124.71,2.58,167.93)->(12.85,7.60,134.63)';   endif
if( coltemp = 'inferno_r' ); coltemp ='(252.03,254.58,164.46)->(249.16,140.47,9.96)->(186.13,54.25,85.13)->(85.48,15.32,109.27)->(0.37,0.12,3.54)';       endif
if( coltemp = 'magma_r' );   coltemp ='(251.70,252.82,191.12)->(251.35,134.68,96.74)->(181.04,54.26,121.69)->(79.15,17.77,123.21)->(0.37,0.12,3.54)';     endif
if( coltemp = 'cividis_r' ); coltemp ='(253.91,231.88,55.53)->(186.77,172.73,108.56)->(123.71,123.03,119.95)->(66.23,77.81,107.82)->(0.00,34.45,77.71)';  endif
*****

****** Diverging colormaps from Matplotlib:
if( coltemp = 'PiYG' );     coltemp ='(142.00,1.00,82.00)->(231.69,151.12,196.43)->(246.67,246.96,246.24)->(153.82,205.41,97.47)->(39.00,100.00,25.00)'; endif
if( coltemp = 'PRGn' );     coltemp ='(64.00,0.00,75.00)->(173.90,139.02,189.35)->(246.41,246.86,246.29)->(125.76,195.18,126.65)->(0.00,68.00,27.00)'; endif
if( coltemp = 'BrBG' );     coltemp ='(84.00,48.00,5.00)->(207.31,162.14,85.78)->(244.10,244.78,244.69)->(88.29,176.41,166.53)->(0.00,60.00,48.00)'; endif
if( coltemp = 'PuOr' );     coltemp ='(127.00,59.00,8.00)->(238.78,157.53,60.27)->(246.39,246.43,246.76)->(151.53,141.35,189.88)->(45.00,0.00,75.00)'; endif
if( coltemp = 'RdGy' );     coltemp ='(103.00,0.00,31.00)->(229.29,131.18,104.02)->(254.39,254.39,254.39)->(159.00,159.00,159.00)->(26.00,26.00,26.00)'; endif
if( coltemp = 'RdBu' );     coltemp ='(103.00,0.00,31.00)->(229.29,131.18,104.02)->(246.25,246.65,246.86)->(104.18,170.53,207.71)->(5.00,48.00,97.00)'; endif
if( coltemp = 'RdYlBu' );   coltemp ='(165.00,0.00,38.00)->(248.59,142.14,82.29)->(254.39,254.76,192.12)->(141.88,193.71,220.29)->(49.00,54.00,149.00)'; endif
if( coltemp = 'RdYlGn' );   coltemp ='(165.00,0.00,38.00)->(248.59,142.14,82.29)->(254.25,254.69,189.98)->(132.12,202.18,102.29)->(0.00,104.00,55.00)'; endif
if( coltemp = 'Spectral' ); coltemp ='(158.00,1.00,66.00)->(248.59,142.14,82.29)->(254.51,254.80,190.24)->(134.47,206.71,164.53)->(94.00,79.00,162.00)'; endif
if( coltemp = 'coolwarm' ); coltemp ='(58.60,76.17,192.19)->(141.35,175.97,253.86)->(221.19,220.42,219.96)->(243.95,152.50,121.71)->(179.95,3.97,38.31)'; endif
if( coltemp = 'bwr' );      coltemp ='(0.00,0.00,255.00)->(128.00,128.00,255.00)->(255.00,254.00,254.00)->(255.00,126.00,126.00)->(255.00,0.00,0.00)'; endif
if( coltemp = 'seismic' );  coltemp ='(0.00,0.00,76.50)->(1.00,1.00,255.00)->(255.00,253.00,253.00)->(253.50,0.00,0.00)->(127.50,0.00,0.00)'; endif
** reversed
if( coltemp = 'PiYG_r' );     coltemp ='(39.00,100.00,25.00)->(156.06,206.86,100.18)->(247.12,246.55,246.84)->(230.94,148.65,194.71)->(142.00,1.00,82.00)'; endif
if( coltemp = 'PRGn_r' );     coltemp ='(0.00,68.00,27.00)->(128.75,196.94,129.12)->(246.69,246.31,246.71)->(172.29,136.94,187.94)->(64.00,0.00,75.00)'; endif
if( coltemp = 'BrBG_r' );     coltemp ='(0.00,60.00,48.00)->(91.24,178.53,168.49)->(245.02,244.75,244.02)->(206.06,159.59,82.65)->(84.00,48.00,5.00)'; endif
if( coltemp = 'PuOr_r' );     coltemp ='(45.00,0.00,75.00)->(153.49,143.55,191.37)->(247.14,246.55,245.73)->(237.65,155.41,57.18)->(127.00,59.00,8.00)'; endif
if( coltemp = 'RdGy_r' );     coltemp ='(26.00,26.00,26.00)->(161.00,161.00,161.00)->(254.96,254.29,253.90)->(228.12,128.47,101.94)->(103.00,0.00,31.00)'; endif
if( coltemp = 'RdBu_r' );     coltemp ='(5.00,48.00,97.00)->(107.27,172.49,208.76)->(247.12,246.45,246.06)->(228.12,128.47,101.94)->(103.00,0.00,31.00)'; endif
if( coltemp = 'RdYlBu_r' );   coltemp ='(49.00,54.00,149.00)->(144.04,195.43,221.24)->(254.98,254.39,190.08)->(248.24,139.59,81.12)->(165.00,0.00,38.00)'; endif
if( coltemp = 'RdYlGn_r' );   coltemp ='(0.00,104.00,55.00)->(134.63,203.27,102.57)->(254.98,254.39,189.98)->(248.24,139.59,81.12)->(165.00,0.00,38.00)'; endif
if( coltemp = 'Spectral_r' ); coltemp ='(94.00,79.00,162.00)->(137.18,207.76,164.49)->(254.98,254.39,189.98)->(248.24,139.59,81.12)->(158.00,1.00,66.00)'; endif
if( coltemp = 'coolwarm_r' ); coltemp ='(179.95,3.97,38.31)->(244.36,154.11,123.24)->(220.16,220.60,221.25)->(139.96,174.70,253.57)->(58.60,76.17,192.19)'; endif
if( coltemp = 'bwr_r' );      coltemp ='(255.00,0.00,0.00)->(255.00,128.00,128.00)->(254.00,254.00,255.00)->(126.00,126.00,255.00)->(0.00,0.00,255.00)'; endif
if( coltemp = 'seismic_r' );  coltemp ='(127.50,0.00,0.00)->(255.00,1.00,1.00)->(253.00,253.00,255.00)->(0.00,0.00,252.90)->(0.00,0.00,76.50)'; endif
*****

****** Linear colormaps from MyCarta:
if( coltemp = 'cube1' );      coltemp ='(120,0,133)->(119,81,242)->(77,156,219)->(73,207,129)->(133,235,80)->(213,230,91)->(249,150,91)'; endif
if( coltemp = 'cubeYF' );     coltemp ='(123,2,144)->(125,72,234)->(91,136,239)->(56,185,179)->(81,216,102)->(138,235,81)->(209,235,91)'; endif
if( coltemp = 'linear_l' );   coltemp ='(4,4,4)->(45,23,67)->(28,56,126)->(1,99,110)->(0,141,64)->(52,177,0)->(172,198,0)->(245,214,183)->(255,255,255)'; endif
** reversed
if( coltemp = 'cube1_r' );    coltemp ='(249,150,91)->(213,230,91)->(133,235,80)->(73,207,129)->(77,156,219)->(119,81,242)->(120,0,133)'; endif
if( coltemp = 'cubeYF_r' );   coltemp ='(209,235,91)->(138,235,81)->(81,216,102)->(56,185,179)->(91,136,239)->(125,72,234)->(123,2,144)'; endif
if( coltemp = 'linear_l_r' ); coltemp ='(255,255,255)->(245,214,183)->(172,198,0)->(52,177,0)->(0,141,64)->(1,99,110)->(28,56,126)->(45,23,67)->(4,4,4)'; endif
*****

****** colormaps from Seaborn:
* sequential
if( coltemp = 'rocket' ); coltemp ='(2.71,4.61,25.55)->(62.54,26.77,67.31)->(131.91,30.08,90.41)->(203.11,26.79,79.21)->(240.44,95.75,67.24)->(245.93,170.91,131.35)->(250.25,234.76,220.67)'; endif
if( coltemp = 'mako' ); coltemp ='(11.49,3.78,5.34)->(50.84,34.98,68.95)->(63.64,72.82,142.04)->(52.77,122.91,162.72)->(56.27,169.82,172.09)->(121.31,213.73,174.29)->(222.41,244.70,228.80)'; endif
if( coltemp = 'flare' ); coltemp ='(236.91,175.64,128.55)->(232.72,134.88,103.91)->(222.36,92.66,91.73)->(193.45,64.66,103.69)->(154.04,53.60,111.98)->(113.69,44.27,109.94)->(74.99,34.99,98.03)'; endif
if( coltemp = 'crest' ); coltemp ='(164.94,204.74,144.31)->(118.23,182.63,144.52)->(79.74,158.28,143.77)->(51.24,132.82,141.12)->(29.10,107.53,137.87)->(35.36,79.02,129.12)->(44.28,48.65,113.60)'; endif
* diverging
if( coltemp = 'vlag' ); coltemp ='(35.32,105.39,188.83)->(119.82,149.87,192.99)->(188.94,198.41,215.41)->(250.05,245.20,244.32)->(224.79,184.54,182.27)->(197.97,119.63,117.26)->(168.51,54.89,58.83)'; endif
if( coltemp = 'icefire' ); coltemp ='(188.54,230.63,218.68)->(95.69,171.00,205.07)->(64.83,103.10,199.30)->(54.98,52.93,92.12)->(31.33,30.08,30.02)->(92.26,40.52,53.06)->(184.62,52.76,63.82)->(237.34,125.82,63.92)->(254.80,211.91,172.49)'; endif
** reversed
if( coltemp = 'rocket_r' ); coltemp ='(250.25,234.76,220.67)->(245.93,170.91,131.35)->(240.44,95.75,67.24)->(201.67,25.97,79.91)->(131.91,30.08,90.41)->(62.54,26.77,67.31)->(2.71,4.61,25.55)'; endif
if( coltemp = 'mako_r' ); coltemp ='(222.41,244.70,228.80)->(121.31,213.73,174.29)->(56.27,169.82,172.09)->(52.84,121.80,162.46)->(63.64,72.82,142.04)->(50.84,34.98,68.95)->(11.49,3.78,5.34)'; endif
if( coltemp = 'flare_r' ); coltemp ='(74.99,34.99,98.03)->(113.69,44.27,109.94)->(154.04,53.60,111.98)->(194.35,65.01,103.38)->(222.36,92.66,91.73)->(232.72,134.88,103.91)->(236.91,175.64,128.55)'; endif
if( coltemp = 'crest_r' ); coltemp ='(44.28,48.65,113.60)->(35.36,79.02,129.12)->(29.10,107.53,137.87)->(51.89,133.41,141.20)->(79.74,158.28,143.77)->(118.23,182.63,144.52)->(164.94,204.74,144.31)'; endif
* diverging
if( coltemp = 'vlag_r' ); coltemp ='(168.51,54.89,58.83)->(197.97,119.63,117.26)->(224.79,184.54,182.27)->(249.85,245.37,244.64)->(188.94,198.41,215.41)->(119.82,149.87,192.99)->(35.32,105.39,188.83)'; endif
if( coltemp = 'icefire_r' ); coltemp ='(254.80,211.91,172.49)->(236.62,122.91,61.57)->(182.01,51.70,64.59)->(89.61,40.04,51.99)->(30.93,30.16,30.29)->(56.22,54.09,95.30)->(63.41,105.42,201.12)->(98.51,172.84,205.10)->(188.54,230.63,218.68)'; endif
*****

      kind2 = kind2 % coltemp % c
      coltemp = ''
    else
      coltemp = coltemp % c
    endif

    i = i + 1
  endwhile
*  say kind2
return ( kind2 )


**********************************************
*
* get color from -kind parameters
*
*   kind : -kind parameter
*   num  : order
*
**********************************************
function getcol( kind, num )
  ret = ''
  length = math_strlen( kind );

  order = 1
  i = 1
  while( i <= length )
    c  = substr( kind, i, 1 )
    c2 = substr( kind, i+1, 1 )

    if( c%c2 = '->' ); order=order+1; i=i+1;
    else
      if( order = num ); ret=ret%c; endif
    endif

    i = i + 1
  endwhile

return ( ret )


**********************************************
*
* define color
*
*   snum : start color number
*   scol : start color name
*   enum : end   color number
*   ecol : end   color name
*
**********************************************
function defcol( snum, scol, enum, ecol, defalpha )
*  say snum'('scol') -> 'enum'('ecol')'
  diff = enum - snum
  if( diff <= 0.0 )
    return
  endif

*** set start & end color (rgb)
  sr = colornum( scol, 'r' )
  sg = colornum( scol, 'g' )
  sb = colornum( scol, 'b' )
  sa = colornum( scol, 'a' )
  if( sa = -1 ) ; sa = defalpha ; endif

  er = colornum( ecol, 'r' )
  eg = colornum( ecol, 'g' )
  eb = colornum( ecol, 'b' )
  ea = colornum( ecol, 'a' )
  if( ea = -1 ) ; ea = defalpha ; endif

*** set initial color number (integer)
* e.g.,
*   i=16   -> 16
*   i=16.5 -> 17
*   i=16.9 -> 17
*
  i = math_int( snum ) 
  if( snum != 16 )
    i = i + 1
  endif

*** set color
  ret = ''
  while( i <= enum )
    r = math_nint( sr + (er-sr) * (i-snum) / diff )
    g = math_nint( sg + (eg-sg) * (i-snum) / diff )
    b = math_nint( sb + (eb-sb) * (i-snum) / diff )
    a = math_nint( sa + (ea-sa) * (i-snum) / diff )
    if( _verbose = 1 ) ; say 'ccol=' % i % ' : (' % r % ',' % g % ',' % b % ')' ; endif

   'set rgb 'i' 'r' 'g' 'b' 'a

* alteração Lucas
*    say "'set rgb "i" "r" "g" "b" "a"'"

    ret = ret' 'i' 'r' 'g' 'b' 'a
    i = i + 1
  endwhile

return ret


**********************************************
*
* color -> rgb value table
*
*   color  : color name
*   rgb    : "r" or "g" or "b" or "a"
*
*   return : rgb value
*
**********************************************
function colornum( color, rgb )
  r=-1; g=-1; b=-1; a=-1

*** define rgb value
if( color = 'black')               ; r=0  ; g=0  ; b=0  ; endif
if( color = 'navy')                ; r=0  ; g=0  ; b=128; endif
if( color = 'darkblue')            ; r=0  ; g=0  ; b=139; endif
if( color = 'mediumblue')          ; r=0  ; g=0  ; b=205; endif
if( color = 'blue')                ; r=0  ; g=0  ; b=255; endif
if( color = 'darkgreen')           ; r=0  ; g=100; b=0  ; endif
if( color = 'green')               ; r=0  ; g=128; b=0  ; endif
if( color = 'teal')                ; r=0  ; g=128; b=128; endif
if( color = 'darkcyan')            ; r=0  ; g=139; b=139; endif
if( color = 'deepskyblue')         ; r=0  ; g=191; b=255; endif
if( color = 'darkturquoise')       ; r=0  ; g=206; b=209; endif
if( color = 'mediumspringgreen')   ; r=0  ; g=250; b=154; endif
if( color = 'lime')                ; r=0  ; g=255; b=0  ; endif
if( color = 'springgreen')         ; r=0  ; g=255; b=127; endif
if( color = 'aqua')                ; r=0  ; g=255; b=255; endif
if( color = 'cyan')                ; r=0  ; g=255; b=255; endif
if( color = 'midnightblue')        ; r=25 ; g=25 ; b=112; endif
if( color = 'dodgerblue')          ; r=30 ; g=144; b=255; endif
if( color = 'lightseagreen')       ; r=32 ; g=178; b=170; endif
if( color = 'forestgreen')         ; r=34 ; g=139; b=34 ; endif
if( color = 'seagreen')            ; r=46 ; g=139; b=87 ; endif
if( color = 'darkslategray')       ; r=47 ; g=79 ; b=79 ; endif
if( color = 'limegreen')           ; r=50 ; g=205; b=50 ; endif
if( color = 'mediumseagreen')      ; r=60 ; g=179; b=113; endif
if( color = 'turquoise')           ; r=64 ; g=224; b=208; endif
if( color = 'royalblue')           ; r=65 ; g=105; b=225; endif
if( color = 'steelblue')           ; r=70 ; g=130; b=180; endif
if( color = 'darkslateblue')       ; r=72 ; g=61 ; b=139; endif
if( color = 'mediumturquoise')     ; r=72 ; g=209; b=204; endif
if( color = 'indigo')              ; r=75 ; g=0  ; b=130; endif
if( color = 'darkolivegreen')      ; r=85 ; g=107; b=47 ; endif
if( color = 'cadetblue')           ; r=95 ; g=158; b=160; endif
if( color = 'cornflowerblue')      ; r=100; g=149; b=237; endif
if( color = 'mediumaquamarine')    ; r=102; g=205; b=170; endif
if( color = 'dimgray')             ; r=105; g=105; b=105; endif
if( color = 'slateblue')           ; r=106; g=90 ; b=205; endif
if( color = 'olivedrab')           ; r=107; g=142; b=35 ; endif
if( color = 'slategray')           ; r=112; g=128; b=144; endif
if( color = 'lightslategray')      ; r=119; g=136; b=153; endif
if( color = 'mediumslateblue')     ; r=123; g=104; b=238; endif
if( color = 'lawngreen')           ; r=124; g=252; b=0  ; endif
if( color = 'chartreuse')          ; r=127; g=255; b=0  ; endif
if( color = 'aquamarine')          ; r=127; g=255; b=212; endif
if( color = 'maroon')              ; r=128; g=0  ; b=0  ; endif
if( color = 'purple')              ; r=128; g=0  ; b=128; endif
if( color = 'olive')               ; r=128; g=128; b=0  ; endif
if( color = 'gray')                ; r=128; g=128; b=128; endif
if( color = 'skyblue')             ; r=135; g=206; b=235; endif
if( color = 'lightskyblue')        ; r=135; g=206; b=250; endif
if( color = 'blueviolet')          ; r=138; g=43 ; b=226; endif
if( color = 'darkred')             ; r=139; g=0  ; b=0  ; endif
if( color = 'darkmagenta')         ; r=139; g=0  ; b=139; endif
if( color = 'saddlebrown')         ; r=139; g=69 ; b=19 ; endif
if( color = 'darkseagreen')        ; r=143; g=188; b=143; endif
if( color = 'lightgreen')          ; r=144; g=238; b=144; endif
if( color = 'mediumpurple')        ; r=147; g=112; b=219; endif
if( color = 'darkviolet')          ; r=148; g=0  ; b=211; endif
if( color = 'palegreen')           ; r=152; g=251; b=152; endif
if( color = 'darkorchid')          ; r=153; g=50 ; b=204; endif
if( color = 'yellowgreen')         ; r=154; g=205; b=50 ; endif
if( color = 'sienna')              ; r=160; g=82 ; b=45 ; endif
if( color = 'brown')               ; r=165; g=42 ; b=42 ; endif
if( color = 'darkgray')            ; r=169; g=169; b=169; endif
if( color = 'lightblue')           ; r=173; g=216; b=230; endif
if( color = 'greenyellow')         ; r=173; g=255; b=47 ; endif
if( color = 'paleturquoise')       ; r=175; g=238; b=238; endif
if( color = 'lightsteelblue')      ; r=176; g=196; b=222; endif
if( color = 'powderblue')          ; r=176; g=224; b=230; endif
if( color = 'firebrick')           ; r=178; g=34 ; b=34 ; endif
if( color = 'darkgoldenrod')       ; r=184; g=134; b=11 ; endif
if( color = 'mediumorchid')        ; r=186; g=85 ; b=211; endif
if( color = 'rosybrown')           ; r=188; g=143; b=143; endif
if( color = 'darkkhaki')           ; r=189; g=183; b=107; endif
if( color = 'silver')              ; r=192; g=192; b=192; endif
if( color = 'mediumvioletred')     ; r=199; g=21 ; b=133; endif
if( color = 'indianred')           ; r=205; g=92 ; b=92 ; endif
if( color = 'peru')                ; r=205; g=133; b=63 ; endif
if( color = 'chocolate')           ; r=210; g=105; b=30 ; endif
if( color = 'tan')                 ; r=210; g=180; b=140; endif
if( color = 'lightgray')           ; r=211; g=211; b=211; endif
if( color = 'thistle')             ; r=216; g=191; b=216; endif
if( color = 'orchid')              ; r=218; g=112; b=214; endif
if( color = 'goldenrod')           ; r=218; g=165; b=32 ; endif
if( color = 'palevioletred')       ; r=219; g=112; b=147; endif
if( color = 'crimson')             ; r=220; g=20 ; b=60 ; endif
if( color = 'gainsboro')           ; r=220; g=220; b=220; endif
if( color = 'plum')                ; r=221; g=160; b=221; endif
if( color = 'burlywood')           ; r=222; g=184; b=135; endif
if( color = 'lightcyan')           ; r=224; g=255; b=255; endif
if( color = 'lavender')            ; r=230; g=230; b=250; endif
if( color = 'darksalmon')          ; r=233; g=150; b=122; endif
if( color = 'violet')              ; r=238; g=130; b=238; endif
if( color = 'palegoldenrod')       ; r=238; g=232; b=170; endif
if( color = 'lightcoral')          ; r=240; g=128; b=128; endif
if( color = 'khaki')               ; r=240; g=230; b=140; endif
if( color = 'aliceblue')           ; r=240; g=248; b=255; endif
if( color = 'honeydew')            ; r=240; g=255; b=240; endif
if( color = 'azure')               ; r=240; g=255; b=255; endif
if( color = 'sandybrown')          ; r=244; g=164; b=96 ; endif
if( color = 'wheat')               ; r=245; g=222; b=179; endif
if( color = 'beige')               ; r=245; g=245; b=220; endif
if( color = 'whitesmoke')          ; r=245; g=245; b=245; endif
if( color = 'mintcream')           ; r=245; g=255; b=250; endif
if( color = 'ghostwhite')          ; r=248; g=248; b=255; endif
if( color = 'salmon')              ; r=250; g=128; b=114; endif
if( color = 'antiquewhite')        ; r=250; g=235; b=215; endif
if( color = 'linen')               ; r=250; g=240; b=230; endif
if( color = 'lightgoldenrodyellow'); r=250; g=250; b=210; endif
if( color = 'oldlace')             ; r=253; g=245; b=230; endif
if( color = 'red')                 ; r=255; g=0  ; b=0  ; endif
if( color = 'fuchsia')             ; r=255; g=0  ; b=255; endif
if( color = 'magenta')             ; r=255; g=0  ; b=255; endif
if( color = 'deeppink')            ; r=255; g=20 ; b=147; endif
if( color = 'orangered')           ; r=255; g=69 ; b=0  ; endif
if( color = 'tomato')              ; r=255; g=99 ; b=71 ; endif
if( color = 'hotpink')             ; r=255; g=105; b=180; endif
if( color = 'coral')               ; r=255; g=127; b=80 ; endif
if( color = 'darkorange')          ; r=255; g=140; b=0  ; endif
if( color = 'lightsalmon')         ; r=255; g=160; b=122; endif
if( color = 'orange')              ; r=255; g=165; b=0  ; endif
if( color = 'lightpink')           ; r=255; g=182; b=193; endif
if( color = 'pink')                ; r=255; g=192; b=203; endif
if( color = 'gold')                ; r=255; g=215; b=0  ; endif
if( color = 'peachpuff')           ; r=255; g=218; b=185; endif
if( color = 'navajowhite')         ; r=255; g=222; b=173; endif
if( color = 'moccasin')            ; r=255; g=228; b=181; endif
if( color = 'bisque')              ; r=255; g=228; b=196; endif
if( color = 'mistyrose')           ; r=255; g=228; b=225; endif
if( color = 'blanchedalmond')      ; r=255; g=235; b=205; endif
if( color = 'papayawhip')          ; r=255; g=239; b=213; endif
if( color = 'lavenderblush')       ; r=255; g=240; b=245; endif
if( color = 'seashell')            ; r=255; g=245; b=238; endif
if( color = 'cornsilk')            ; r=255; g=248; b=220; endif
if( color = 'lemonchiffon')        ; r=255; g=250; b=205; endif
if( color = 'floralwhite')         ; r=255; g=250; b=240; endif
if( color = 'snow')                ; r=255; g=250; b=250; endif
if( color = 'yellow')              ; r=255; g=255; b=0  ; endif
if( color = 'lightyellow')         ; r=255; g=255; b=224; endif
if( color = 'ivory')               ; r=255; g=255; b=240; endif
if( color = 'white')               ; r=255; g=255; b=255; endif


*** direct rgb specification
  length = math_strlen( color )
  first = substr( color, 1, 1 )
  if( first = '(' )
    i = 2
    k = 1
    rgb.1 = ''

    while( i <= length )
      c = substr( color, i, 1 )
      if( c = ',' | c = ')' )
        k = k + 1
        rgb.k = ''
      else
        rgb.k = rgb.k % c
      endif
      i = i + 1
    endwhile

    r = rgb.1
    g = rgb.2
    b = rgb.3
    a = rgb.4
  endif

*** return  
  if( rgb = 'r' ); return( r ); endif
  if( rgb = 'g' ); return( g ); endif
  if( rgb = 'b' ); return( b ); endif
  if( valnum(a) != 1 ) ; a = -1 ; endif
  if( rgb = 'a' ); return( a ); endif

return


*
* help
*
function help()
  say '   color '_version' (modified) - Set color table for drawing.'
  say ' '
  say ' Usage:'
  say '   color'
  say '       (min max [int [inttype]] | -levs lev1 lev2 ... | -var var-name)'
  say '       [-div value]'
  say '       [-gxout gxout-name]'
  say '       [-kind string] [-alpha value]'
  say '       [-sample] [-xcbar [xcbar-args]]'
  say '       [-ret]'
  say '       [-verbose | -v]'
  say ''
  say '     min max [int [inttype]]'
  say '                      : Minimum, maximum, interval of values and type of interval.'
  say '                        inttype may be: "linear" (default), "fac".'
  say '     -levs lev1 lev2 ... '
  say '                      : Levels of variable value.'
  say '     -var var-name    : Name of variable to draw.'
  say '     -div div         : When "int" is not specified,'
  say '                        [min:max] is divided by "div" (default: 10)'
  say '     -gxout gxout-name: Type of gxout.'
  say '     -kind kind       : One color list name, '
  say '                        or color list name, color name, and/or rgb(a) values connected with "->".'
  say '                        e.g., blue->white->red, bluered,'
  say '                              (200,100,100)->red->(0.0,0)'
  say '                        You can specify the number of transition colors'
  say '                        between any two colors using -(n)-> :'
  say '                        e.g. white-(0)->blue->red'
  say '                        will render no transition from white to blue.'
  say '     -alpha           : Transparancy (0: transparent, 255: non-transparent).'
  say '     -sample          : Draw color table.'
  say '     -xcbar xcbar-args: Run xcbar.gs to draw color bar.'
  say '                        xcbar.gs is necessary.'
  say '     -ret             : Pretend to be script function.'
  say '     -verbose         : Verbose mode.'
  say ''
  say '┌─ More options:'
  say '│    -use-rev         : -showall & -sample-* will use the reversed colormaps.'
  say '│    -use-rgb         : -showall & -sample-* will (try to) use RGB code instead of name.'
  say '│    -sample-default    : Same as -sample, but print all the default colormaps.'
  say '│    -sample-sequential : Same as -sample, but print all the sequential colormaps.'
  say '│    -sample-diverging  : Same as -sample, but print all the diverging colormaps.'
  say '│    -sample-linear     : Same as -sample, but print all the linear colormaps.'
  say '│    -sample-seaborn    : Same as -sample, but print all the seaborn colormaps.'
  say '│    -show-all          : Print all the current named colors.*'
  say '└─                     *(Options that come after this will be ignored).'
  say ''
  say ' Note:'
  say '   [arg-name]       : specify if needed'
  say '   (arg1 | arg2)    : arg1 or arg2 must be specified'
  say ''
  say ' Modified version by Lucas Nogueira - LabMet UFPR.'
  say '   Additional Colormaps from matplotlib [sequential,diverging]:'
  say '     https://matplotlib.org/stable/users/explain/colors/colormaps.html'
  say '   Additional Colormaps from MyCarta [linear]:'
  say '     https://mycartablog.com/color-palettes/'
  say '   Additional Colormaps from Seaborn:'
  say '     https://seaborn.pydata.org/tutorial/color_palettes.html'
  say ''
  say ' Original author & Copyright information:'
  say ' Copyright (C) 2005-2022 Chihiro Kodama - Distributed under GNU GPL'
  say ''
return




*** ------ Functions added by Lucas Nogueira:
*


function list_colors()

* default values
ncols=5
nlins=28
txtpercent=80
txtxoffset=0.05

delta=0.01


'query gxinfo'

xpagesize=sublin(result,3) 
xpagesize=subwrd(xpagesize,6) 

ypagesize=sublin(result,4)
ypagesize=subwrd(ypagesize,6) 


xstep=xpagesize/ncols
ystep=ypagesize/nlins

if(xstep < 0 | ystep < 0)
    say 'error at list_colors() function, step must be greater than 0.'
    return
endif

* create _levcol and _cname variables
setallcolors(ncols,nlins)

i=0
x=0
xi=x*xstep
while(xi < xpagesize)

    cbarxsize=xstep*((100 - txtpercent)/100)
    cbarxf=xi+cbarxsize
    txtxi=cbarxf + txtxoffset
    
    
    'xcbar 'xi' 'cbarxf' 0 'ypagesize' -line on -direction vertical -fcolor 0 -levcol '_levcol.x


    yi=ystep/2
    while(yi < ypagesize)
        'set string 1 l'

        if(_usergb = 1)
            'draw string 'txtxi' 'yi' '_crgb.i
        else
            'draw string 'txtxi' 'yi' '_cname.i
        endif

        i=i+1
        yi=yi+ystep
    endwhile
x=x+1
xi=x*xstep
endwhile

return

function setnamedcolor(cname,r,g,b,index)
    _cname.index=cname
    _crgb.index='('r','g','b')'
    rgbn=index+16
    
    'set rgb 'rgbn' 'r' 'g' 'b
return


function setallcolors(col,lin)

    i=0
    
    setnamedcolor('black'               , 0  , 0  , 0  , i); i=i+1;
    setnamedcolor('navy'                , 0  , 0  , 128, i); i=i+1;
    setnamedcolor('darkblue'            , 0  , 0  , 139, i); i=i+1;
    setnamedcolor('mediumblue'          , 0  , 0  , 205, i); i=i+1;
    setnamedcolor('blue'                , 0  , 0  , 255, i); i=i+1;
    setnamedcolor('darkgreen'           , 0  , 100, 0  , i); i=i+1;
    setnamedcolor('green'               , 0  , 128, 0  , i); i=i+1;
    setnamedcolor('teal'                , 0  , 128, 128, i); i=i+1;
    setnamedcolor('darkcyan'            , 0  , 139, 139, i); i=i+1;
    setnamedcolor('deepskyblue'         , 0  , 191, 255, i); i=i+1;
    setnamedcolor('darkturquoise'       , 0  , 206, 209, i); i=i+1;
    setnamedcolor('mediumspringgreen'   , 0  , 250, 154, i); i=i+1;
    setnamedcolor('lime'                , 0  , 255, 0  , i); i=i+1;
    setnamedcolor('springgreen'         , 0  , 255, 127, i); i=i+1;
    setnamedcolor('aqua'                , 0  , 255, 255, i); i=i+1;
    setnamedcolor('cyan'                , 0  , 255, 255, i); i=i+1;
    setnamedcolor('midnightblue'        , 25 , 25 , 112, i); i=i+1;
    setnamedcolor('dodgerblue'          , 30 , 144, 255, i); i=i+1;
    setnamedcolor('lightseagreen'       , 32 , 178, 170, i); i=i+1;
    setnamedcolor('forestgreen'         , 34 , 139, 34 , i); i=i+1;
    setnamedcolor('seagreen'            , 46 , 139, 87 , i); i=i+1;
    setnamedcolor('darkslategray'       , 47 , 79 , 79 , i); i=i+1;
    setnamedcolor('limegreen'           , 50 , 205, 50 , i); i=i+1;
    setnamedcolor('mediumseagreen'      , 60 , 179, 113, i); i=i+1;
    setnamedcolor('turquoise'           , 64 , 224, 208, i); i=i+1;
    setnamedcolor('royalblue'           , 65 , 105, 225, i); i=i+1;
    setnamedcolor('steelblue'           , 70 , 130, 180, i); i=i+1;
    setnamedcolor('darkslateblue'       , 72 , 61 , 139, i); i=i+1;
    setnamedcolor('mediumturquoise'     , 72 , 209, 204, i); i=i+1;
    setnamedcolor('indigo'              , 75 , 0  , 130, i); i=i+1;
    setnamedcolor('darkolivegreen'      , 85 , 107, 47 , i); i=i+1;
    setnamedcolor('cadetblue'           , 95 , 158, 160, i); i=i+1;
    setnamedcolor('cornflowerblue'      , 100, 149, 237, i); i=i+1;
    setnamedcolor('mediumaquamarine'    , 102, 205, 170, i); i=i+1;
    setnamedcolor('dimgray'             , 105, 105, 105, i); i=i+1;
    setnamedcolor('slateblue'           , 106, 90 , 205, i); i=i+1;
    setnamedcolor('olivedrab'           , 107, 142, 35 , i); i=i+1;
    setnamedcolor('slategray'           , 112, 128, 144, i); i=i+1;
    setnamedcolor('lightslategray'      , 119, 136, 153, i); i=i+1;
    setnamedcolor('mediumslateblue'     , 123, 104, 238, i); i=i+1;
    setnamedcolor('lawngreen'           , 124, 252, 0  , i); i=i+1;
    setnamedcolor('chartreuse'          , 127, 255, 0  , i); i=i+1;
    setnamedcolor('aquamarine'          , 127, 255, 212, i); i=i+1;
    setnamedcolor('maroon'              , 128, 0  , 0  , i); i=i+1;
    setnamedcolor('purple'              , 128, 0  , 128, i); i=i+1;
    setnamedcolor('olive'               , 128, 128, 0  , i); i=i+1;
    setnamedcolor('gray'                , 128, 128, 128, i); i=i+1;
    setnamedcolor('skyblue'             , 135, 206, 235, i); i=i+1;
    setnamedcolor('lightskyblue'        , 135, 206, 250, i); i=i+1;
    setnamedcolor('blueviolet'          , 138, 43 , 226, i); i=i+1;
    setnamedcolor('darkred'             , 139, 0  , 0  , i); i=i+1;
    setnamedcolor('darkmagenta'         , 139, 0  , 139, i); i=i+1;
    setnamedcolor('saddlebrown'         , 139, 69 , 19 , i); i=i+1;
    setnamedcolor('darkseagreen'        , 143, 188, 143, i); i=i+1;
    setnamedcolor('lightgreen'          , 144, 238, 144, i); i=i+1;
    setnamedcolor('mediumpurple'        , 147, 112, 219, i); i=i+1;
    setnamedcolor('darkviolet'          , 148, 0  , 211, i); i=i+1;
    setnamedcolor('palegreen'           , 152, 251, 152, i); i=i+1;
    setnamedcolor('darkorchid'          , 153, 50 , 204, i); i=i+1;
    setnamedcolor('yellowgreen'         , 154, 205, 50 , i); i=i+1;
    setnamedcolor('sienna'              , 160, 82 , 45 , i); i=i+1;
    setnamedcolor('brown'               , 165, 42 , 42 , i); i=i+1;
    setnamedcolor('darkgray'            , 169, 169, 169, i); i=i+1;
    setnamedcolor('lightblue'           , 173, 216, 230, i); i=i+1;
    setnamedcolor('greenyellow'         , 173, 255, 47 , i); i=i+1;
    setnamedcolor('paleturquoise'       , 175, 238, 238, i); i=i+1;
    setnamedcolor('lightsteelblue'      , 176, 196, 222, i); i=i+1;
    setnamedcolor('powderblue'          , 176, 224, 230, i); i=i+1;
    setnamedcolor('firebrick'           , 178, 34 , 34 , i); i=i+1;
    setnamedcolor('darkgoldenrod'       , 184, 134, 11 , i); i=i+1;
    setnamedcolor('mediumorchid'        , 186, 85 , 211, i); i=i+1;
    setnamedcolor('rosybrown'           , 188, 143, 143, i); i=i+1;
    setnamedcolor('darkkhaki'           , 189, 183, 107, i); i=i+1;
    setnamedcolor('silver'              , 192, 192, 192, i); i=i+1;
    setnamedcolor('mediumvioletred'     , 199, 21 , 133, i); i=i+1;
    setnamedcolor('indianred'           , 205, 92 , 92 , i); i=i+1;
    setnamedcolor('peru'                , 205, 133, 63 , i); i=i+1;
    setnamedcolor('chocolate'           , 210, 105, 30 , i); i=i+1;
    setnamedcolor('tan'                 , 210, 180, 140, i); i=i+1;
    setnamedcolor('lightgray'           , 211, 211, 211, i); i=i+1;
    setnamedcolor('thistle'             , 216, 191, 216, i); i=i+1;
    setnamedcolor('orchid'              , 218, 112, 214, i); i=i+1;
    setnamedcolor('goldenrod'           , 218, 165, 32 , i); i=i+1;
    setnamedcolor('palevioletred'       , 219, 112, 147, i); i=i+1;
    setnamedcolor('crimson'             , 220, 20 , 60 , i); i=i+1;
    setnamedcolor('gainsboro'           , 220, 220, 220, i); i=i+1;
    setnamedcolor('plum'                , 221, 160, 221, i); i=i+1;
    setnamedcolor('burlywood'           , 222, 184, 135, i); i=i+1;
    setnamedcolor('lightcyan'           , 224, 255, 255, i); i=i+1;
    setnamedcolor('lavender'            , 230, 230, 250, i); i=i+1;
    setnamedcolor('darksalmon'          , 233, 150, 122, i); i=i+1;
    setnamedcolor('violet'              , 238, 130, 238, i); i=i+1;
    setnamedcolor('palegoldenrod'       , 238, 232, 170, i); i=i+1;
    setnamedcolor('lightcoral'          , 240, 128, 128, i); i=i+1;
    setnamedcolor('khaki'               , 240, 230, 140, i); i=i+1;
    setnamedcolor('aliceblue'           , 240, 248, 255, i); i=i+1;
    setnamedcolor('honeydew'            , 240, 255, 240, i); i=i+1;
    setnamedcolor('azure'               , 240, 255, 255, i); i=i+1;
    setnamedcolor('sandybrown'          , 244, 164, 96 , i); i=i+1;
    setnamedcolor('wheat'               , 245, 222, 179, i); i=i+1;
    setnamedcolor('beige'               , 245, 245, 220, i); i=i+1;
    setnamedcolor('whitesmoke'          , 245, 245, 245, i); i=i+1;
    setnamedcolor('mintcream'           , 245, 255, 250, i); i=i+1;
    setnamedcolor('ghostwhite'          , 248, 248, 255, i); i=i+1;
    setnamedcolor('salmon'              , 250, 128, 114, i); i=i+1;
    setnamedcolor('antiquewhite'        , 250, 235, 215, i); i=i+1;
    setnamedcolor('linen'               , 250, 240, 230, i); i=i+1;
    setnamedcolor('lightgoldenrodyellow', 250, 250, 210, i); i=i+1;
    setnamedcolor('oldlace'             , 253, 245, 230, i); i=i+1;
    setnamedcolor('red'                 , 255, 0  , 0  , i); i=i+1;
    setnamedcolor('fuchsia'             , 255, 0  , 255, i); i=i+1;
    setnamedcolor('magenta'             , 255, 0  , 255, i); i=i+1;
    setnamedcolor('deeppink'            , 255, 20 , 147, i); i=i+1;
    setnamedcolor('orangered'           , 255, 69 , 0  , i); i=i+1;
    setnamedcolor('tomato'              , 255, 99 , 71 , i); i=i+1;
    setnamedcolor('hotpink'             , 255, 105, 180, i); i=i+1;
    setnamedcolor('coral'               , 255, 127, 80 , i); i=i+1;
    setnamedcolor('darkorange'          , 255, 140, 0  , i); i=i+1;
    setnamedcolor('lightsalmon'         , 255, 160, 122, i); i=i+1;
    setnamedcolor('orange'              , 255, 165, 0  , i); i=i+1;
    setnamedcolor('lightpink'           , 255, 182, 193, i); i=i+1;
    setnamedcolor('pink'                , 255, 192, 203, i); i=i+1;
    setnamedcolor('gold'                , 255, 215, 0  , i); i=i+1;
    setnamedcolor('peachpuff'           , 255, 218, 185, i); i=i+1;
    setnamedcolor('navajowhite'         , 255, 222, 173, i); i=i+1;
    setnamedcolor('moccasin'            , 255, 228, 181, i); i=i+1;
    setnamedcolor('bisque'              , 255, 228, 196, i); i=i+1;
    setnamedcolor('mistyrose'           , 255, 228, 225, i); i=i+1;
    setnamedcolor('blanchedalmond'      , 255, 235, 205, i); i=i+1;
    setnamedcolor('papayawhip'          , 255, 239, 213, i); i=i+1;
    setnamedcolor('lavenderblush'       , 255, 240, 245, i); i=i+1;
    setnamedcolor('seashell'            , 255, 245, 238, i); i=i+1;
    setnamedcolor('cornsilk'            , 255, 248, 220, i); i=i+1;
    setnamedcolor('lemonchiffon'        , 255, 250, 205, i); i=i+1;
    setnamedcolor('floralwhite'         , 255, 250, 240, i); i=i+1;
    setnamedcolor('snow'                , 255, 250, 250, i); i=i+1;
    setnamedcolor('yellow'              , 255, 255, 0  , i); i=i+1;
    setnamedcolor('lightyellow'         , 255, 255, 224, i); i=i+1;
    setnamedcolor('ivory'               , 255, 255, 240, i); i=i+1;
    setnamedcolor('white'               , 255, 255, 255, i); i=i+1;
    
    c=0
    rgbn=16
    while(c < col)
        
        l=0
        str=''
        while(l < (lin-1))
            
            str=str%rgbn' 'l' '
            l=l+1
            rgbn=rgbn+1
        endwhile
    
        _levcol.c=str%rgbn
        rgbn=rgbn+1
    
        c=c+1
    endwhile

return
